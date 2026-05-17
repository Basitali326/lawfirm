import stripe
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from io import BytesIO
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.rbac.permissions import HasRBACPermission
from apps.rbac.services import user_has_perm
from core.responses import api_success, api_error
from .models import Invoice, Payment, InvoiceStatus, PaymentMethod, CaseTypeFeePolicy, StripeWebhookEvent
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    PaymentSerializer,
    PaymentCreateSerializer,
    StripeCheckoutCreateSerializer,
    CaseTypeFeePolicySerializer,
)
from apps.notifx.services import notify_invoice_created, notify_payment_received
from .pagination import BillingPagination
from .services import (
    StripePaymentError,
    configure_stripe,
    create_stripe_checkout_session,
    verify_stripe_checkout_session,
    process_stripe_event,
)


class InvoiceViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post"]
    permission_classes = [IsAuthenticated, HasRBACPermission.with_perms(["invoices.view"])]
    serializer_class = InvoiceDetailSerializer
    pagination_class = BillingPagination
    required_permissions_map = {
        "list": ["invoices.view"],
        "retrieve": ["invoices.view"],
        "create": ["invoices.add"],
        "payments": ["invoices.view", "payments.view"],
        "add_payment": ["payments.add"],
        "stripe_checkout": ["invoices.view"],
        "stripe_checkout_verify": ["invoices.view"],
        "pdf": ["invoices.view"],
    }

    def _is_invoice_admin(self, user):
        profile = getattr(user, "profile", None)
        role_upper = (getattr(user, "role", "") or getattr(profile, "role", "") or "").upper()
        firm_id = (
            getattr(user, "firm_id", None)
            or getattr(profile, "firm_id", None)
            or getattr(getattr(user, "owned_firm", None), "id", None)
        )
        is_owner_relation = getattr(getattr(user, "owned_firm", None), "id", None) == firm_id if firm_id else False
        return (
            role_upper in {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN", "OWNER"}
            or is_owner_relation
            or getattr(user, "is_superuser", False)
        )

    def get_permissions(self):
        perms = self.required_permissions_map.get(self.action, ["invoices.view"])
        if self.action == "payments":
            return [
                IsAuthenticated(),
                HasRBACPermission.with_any_perms(perms)(),
            ]
        return [IsAuthenticated(), HasRBACPermission.with_perms(perms)()]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, "profile", None)
        firm_id = (
            getattr(user, "firm_id", None)
            or getattr(profile, "firm_id", None)
            or getattr(getattr(user, "owned_firm", None), "id", None)
        )
        base_qs = Invoice.objects.filter(firm_id=firm_id, is_deleted=False)

        role_upper = (getattr(user, "role", "") or getattr(profile, "role", "") or "").upper()
        is_owner_relation = getattr(getattr(user, "owned_firm", None), "id", None) == firm_id if firm_id else False
        is_admin = (
            role_upper in {"FIRM_OWNER", "FIRM_ADMIN", "SUPER_ADMIN", "OWNER"}
            or is_owner_relation
            or getattr(user, "is_superuser", False)
        )
        client_profile = getattr(user, "client_profile", None)

        if not is_admin:
            can_view_firm_invoices = user_has_perm(user, "invoices.view") or user_has_perm(user, "payments.view")
            if can_view_firm_invoices:
                pass
            elif client_profile:
                base_qs = base_qs.filter(client=client_profile)
            else:
                return Invoice.objects.none()

        qs = base_qs
        status_val = self.request.query_params.get("status")
        if status_val:
            qs = qs.filter(status=status_val)
        auto_only = self.request.query_params.get("auto")
        if auto_only is not None:
            if auto_only.lower() in {"1", "true", "yes"}:
                qs = qs.filter(case_id__isnull=False)
            elif auto_only.lower() in {"0", "false", "no"}:
                qs = qs.filter(case_id__isnull=True)
        client_id = self.request.query_params.get("client_id")
        if client_id:
            qs = qs.filter(client_id=client_id)
        case_id = self.request.query_params.get("case_id")
        if case_id:
            qs = qs.filter(case_id=case_id)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(issue_date__gte=date_from)
        if date_to:
            qs = qs.filter(issue_date__lte=date_to)
        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(invoice_number__icontains=search) | Q(client__name__icontains=search))
        return qs.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        serializer = InvoiceListSerializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        if not self._is_invoice_admin(request.user):
            if not instance.client or getattr(instance.client, "user_id", None) != request.user.id:
                return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceDetailSerializer(instance)
        return api_success("OK", data=serializer.data)

    def create(self, request, *args, **kwargs):
        # Separate permission for add
        if not HasRBACPermission.with_perms(["invoices.add"])().has_permission(request, self):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceCreateSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        invoice = serializer.save()
        notify_invoice_created(invoice, actor=request.user)
        return api_success(
            message="Invoice created",
            data=InvoiceDetailSerializer(invoice).data,
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def payments(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        payments_qs = invoice.payments.all().order_by("-created_at")
        page = self.paginate_queryset(payments_qs)
        serializer = PaymentSerializer(page or payments_qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    @payments.mapping.post
    def add_payment(self, request, pk=None):
        if not HasRBACPermission.with_perms(["payments.add"])().has_permission(request, self):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        if invoice.status == InvoiceStatus.CANCELLED:
            return api_error("Invoice is cancelled", status_code=status.HTTP_400_BAD_REQUEST)
        if invoice.status == InvoiceStatus.PAID:
            return api_error("Invoice already paid", status_code=status.HTTP_409_CONFLICT)
        serializer = PaymentCreateSerializer(data=request.data, context={"request": request, "invoice": invoice})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        result = serializer.save()
        notify_payment_received(result["payment"], actor=request.user)
        return api_success(
            "Payment recorded",
            data={
                "payment": PaymentSerializer(result["payment"]).data,
                "invoice": InvoiceDetailSerializer(result["invoice"]).data,
            },
        )

    @action(detail=True, methods=["post"], url_path="stripe-checkout")
    def stripe_checkout(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        serializer = StripeCheckoutCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        try:
            payment, session = create_stripe_checkout_session(
                invoice=invoice,
                amount=serializer.validated_data["amount"],
                request=request,
                notes=serializer.validated_data.get("notes") or "",
            )
        except StripePaymentError as exc:
            return api_error(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except ImproperlyConfigured as exc:
            return api_error(str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return api_success(
            "Stripe checkout created",
            data={
                "checkout_url": session.url,
                "session_id": session.id,
                "payment": PaymentSerializer(payment).data,
            },
            status_code=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="stripe-checkout-verify")
    def stripe_checkout_verify(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        session_id = (request.query_params.get("session_id") or "").strip()
        if not session_id:
            return api_error("session_id is required", status_code=status.HTTP_400_BAD_REQUEST)
        try:
            result = verify_stripe_checkout_session(invoice=invoice, session_id=session_id)
        except StripePaymentError as exc:
            return api_error(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        except ImproperlyConfigured as exc:
            return api_error(str(exc), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payment = result["payment"]
        inv = result["invoice"]
        return api_success(
            "Stripe checkout verified",
            data={
                "outcome": result["outcome"],
                "stripe_session_status": result["stripe_session_status"],
                "stripe_checkout_status": result["stripe_checkout_status"],
                "payment": PaymentSerializer(payment).data,
                "invoice": InvoiceDetailSerializer(inv).data,
            },
        )

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        invoice = get_object_or_404(self.get_queryset(), id=pk)
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import mm
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        except Exception:
            return api_error("PDF library not installed", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=14 * mm,
            rightMargin=14 * mm,
            topMargin=14 * mm,
            bottomMargin=14 * mm,
            title=f"Invoice {invoice.invoice_number}",
        )
        styles = getSampleStyleSheet()
        normal = ParagraphStyle(
            "invoiceNormal",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#111827"),
        )
        muted = ParagraphStyle(
            "invoiceMuted",
            parent=normal,
            fontSize=8,
            textColor=colors.HexColor("#6b7280"),
        )
        title_style = ParagraphStyle(
            "invoiceTitle",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=13,
            letterSpacing=1.2,
        )
        label_style = ParagraphStyle(
            "invoiceLabel",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=7,
            textColor=colors.HexColor("#111827"),
        )
        big_style = ParagraphStyle(
            "invoiceBig",
            parent=normal,
            fontName="Helvetica-Bold",
            fontSize=13,
        )

        def fmt_amount(value):
            try:
                return f"AED {value:,.2f}"
            except Exception:
                return f"AED {value}"

        story = []
        line_items = list(invoice.line_items.all().order_by("created_at"))

        firm = invoice.firm
        client = invoice.client
        client_user = getattr(client, "user", None)
        amount_due = invoice.balance_amount if invoice.balance_amount is not None else invoice.total_amount

        header = Table(
            [
                [
                    "",
                    Paragraph("INVOICE", title_style),
                    Paragraph(
                        "<b>BILL TO:</b><br/>"
                        f"{getattr(client, 'name', 'Client')}<br/>"
                        f"{getattr(client_user, 'email', '—')}",
                        normal,
                    ),
                ],
                [
                    "",
                    Paragraph(
                        f"<b>{getattr(firm, 'name', 'Lawfirm')}</b><br/>"
                        f"{getattr(firm, 'address', '') or '—'}<br/>"
                        f"{getattr(firm, 'email', '—')}<br/>"
                        f"{getattr(firm, 'phone', '—')}",
                        normal,
                    ),
                    "",
                ],
            ],
            colWidths=[4 * mm, 103 * mm, 75 * mm],
        )
        header.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#6d28d9")),
                    ("SPAN", (2, 0), (2, 1)),
                    ("ALIGN", (2, 0), (2, 1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEBELOW", (1, 1), (2, 1), 0.25, colors.HexColor("#d1d5db")),
                    ("LEFTPADDING", (1, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (1, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        story.append(header)

        summary = Table(
            [
                [
                    Paragraph("<b>INVOICE #</b><br/><br/>" + str(invoice.invoice_number), normal),
                    Paragraph("<b>DATE</b><br/><br/>" + str(invoice.issue_date), normal),
                    Paragraph("<b>INVOICE DUE DATE</b><br/><br/>" + str(invoice.due_date or "—"), normal),
                    Paragraph("<b>AMOUNT DUE</b><br/><br/>" + fmt_amount(amount_due), big_style),
                ]
            ],
            colWidths=[45 * mm, 40 * mm, 45 * mm, 52 * mm],
        )
        summary.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (2, 0), colors.HexColor("#f3f4f6")),
                    ("BACKGROUND", (3, 0), (3, 0), colors.HexColor("#e6eefc")),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.25, colors.HexColor("#d1d5db")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(summary)
        story.append(Spacer(1, 6))
        story.append(
            Paragraph(
                f"<b>CASE:</b> {getattr(getattr(invoice, 'case', None), 'case_number', '—')} "
                f"• {getattr(getattr(invoice, 'case', None), 'title', '—')}",
                normal,
            )
        )
        story.append(Spacer(1, 8))

        rows = [[
            Paragraph("<b>#</b>", label_style),
            Paragraph("<b>DESCRIPTION</b>", label_style),
            Paragraph("<b>QUANTITY</b>", label_style),
            Paragraph("<b>PRICE</b>", label_style),
            Paragraph("<b>AMOUNT</b>", label_style),
        ]]
        for idx, item in enumerate(line_items, start=1):
            rows.append(
                [
                    str(idx),
                    item.description,
                    f"{item.quantity}",
                    fmt_amount(item.unit_amount),
                    fmt_amount(item.total_amount),
                ]
            )
        if not line_items:
            rows.append(["1", "Default case fee", "1", fmt_amount(0), fmt_amount(0)])

        items_table = Table(rows, colWidths=[24 * mm, 78 * mm, 22 * mm, 28 * mm, 30 * mm])
        items_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
                    ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.HexColor("#e5e7eb")),
                    ("LINEBELOW", (0, -1), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(items_table)
        story.append(Spacer(1, 10))

        notes = "This invoice was generated by Lawfirm platform."
        totals_table = Table(
            [
                [Paragraph("<b>NOTES:</b>", label_style), ""],
                [Paragraph(notes, muted), ""],
                [
                    "",
                    Table(
                        [
                            ["SUB-TOTAL", fmt_amount(invoice.total_amount)],
                            ["TAX", fmt_amount(0)],
                            ["TOTAL PAID", fmt_amount(invoice.paid_amount)],
                            ["REMAINING PAYMENT", fmt_amount(invoice.balance_amount)],
                        ],
                        colWidths=[36 * mm, 36 * mm],
                    ),
                ],
            ],
            colWidths=[108 * mm, 74 * mm],
        )
        totals_table.setStyle(
            TableStyle(
                [
                    ("LINEABOVE", (0, 0), (-1, 0), 0.5, colors.HexColor("#e5e7eb")),
                    ("LINEABOVE", (0, 2), (-1, 2), 0.5, colors.HexColor("#e5e7eb")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(totals_table)
        story.append(Spacer(1, 10))

        footer = Table(
            [
                [
                    "",
                    Paragraph(
                        "This invoice was generated by Lawfirm platform.",
                        muted,
                    ),
                    Paragraph("<b>Powered by Lawfirm</b>", muted),
                ]
            ],
            colWidths=[4 * mm, 122 * mm, 56 * mm],
        )
        footer.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#6d28d9")),
                    ("ALIGN", (2, 0), (2, 0), "RIGHT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(footer)

        doc.build(story)
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class CaseTypeFeePolicyViewSet(viewsets.ModelViewSet):
    serializer_class = CaseTypeFeePolicySerializer
    pagination_class = BillingPagination
    permission_classes = [IsAuthenticated]

    def _is_write_allowed(self, user):
        role = (getattr(user, "role", "") or getattr(getattr(user, "profile", None), "role", "") or "").upper()
        if getattr(user, "is_superuser", False) or role == "SUPER_ADMIN":
            return True
        if role in {"FIRM_OWNER", "FIRM_ADMIN", "OWNER", "ADMIN", "MANAGER"}:
            return True
        return (
            user_has_perm(user, "case_type_fees.update")
            or user_has_perm(user, "case_type_fees.add")
            or user_has_perm(user, "case_type_fees.delete")
            or user_has_perm(user, "invoices.update")
            or user_has_perm(user, "settings.update")
        )

    def _is_read_allowed(self, user):
        if self._is_write_allowed(user):
            return True
        return (
            user_has_perm(user, "case_type_fees.view")
            or user_has_perm(user, "invoices.view")
            or user_has_perm(user, "payments.view")
            or user_has_perm(user, "settings.view")
        )

    def _firm(self):
        user = self.request.user
        firm = getattr(user, "firm", None) or getattr(getattr(user, "profile", None), "firm", None)
        if not firm and hasattr(user, "owned_firm"):
            firm = user.owned_firm
        if not firm and getattr(user, "is_superuser", False):
            firm_id = self.request.headers.get("X-FIRM-ID")
            if firm_id:
                from apps.authx.models import Firm
                firm = Firm.objects.filter(id=firm_id).first()
        return firm

    def get_queryset(self):
        firm = self._firm()
        qs = CaseTypeFeePolicy.objects.filter(is_deleted=False).select_related("case_type")
        if firm:
            qs = qs.filter(firm=firm)
        else:
            qs = qs.none()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(case_type__name__icontains=search) | Q(case_type__code__icontains=search))
        case_type_id = self.request.query_params.get("case_type_id")
        if case_type_id:
            qs = qs.filter(case_type_id=case_type_id)
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            if is_active.lower() in {"1", "true", "yes"}:
                qs = qs.filter(is_active=True)
            if is_active.lower() in {"0", "false", "no"}:
                qs = qs.filter(is_active=False)
        return qs.order_by("case_type__name")

    def list(self, request, *args, **kwargs):
        if not self._is_read_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        if not self._is_read_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance)
        return api_success("OK", data=serializer.data)

    def create(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        instance = serializer.save()
        return api_success("Created", data=self.get_serializer(instance).data, status_code=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Updated", data=serializer.data)

    def update(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance, data=request.data, partial=False, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("Updated", data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        if not self._is_write_allowed(request.user):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        instance.is_deleted = True
        from django.utils import timezone
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return api_success("Deleted", data={"id": str(instance.id)})


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            configure_stripe()
        except ImproperlyConfigured:
            return HttpResponse(status=500)

        endpoint_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
        if not endpoint_secret:
            return HttpResponse(status=500)

        payload = request.body
        sig_header = request.headers.get("Stripe-Signature") or request.META.get("HTTP_STRIPE_SIGNATURE")

        try:
            event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        except ValueError:
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            return HttpResponse(status=400)

        event_payload = event.to_dict_recursive() if hasattr(event, "to_dict_recursive") else dict(event)
        event_id = getattr(event, "id", None) or event_payload.get("id")
        event_type = getattr(event, "type", None) or event_payload.get("type", "")
        if not event_id:
            return HttpResponse(status=400)

        event_record, _ = StripeWebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={
                "event_type": event_type,
                "payload": event_payload,
            },
        )
        if event_record.processed_at:
            return HttpResponse(status=200)

        try:
            payment, transitioned_to_succeeded = process_stripe_event(event)
            event_record.payment = payment
            event_record.event_type = event_type
            event_record.payload = event_payload
            event_record.processing_error = ""
            event_record.processed_at = timezone.now()
            event_record.save(
                update_fields=[
                    "payment",
                    "event_type",
                    "payload",
                    "processing_error",
                    "processed_at",
                ]
            )
            if payment and transitioned_to_succeeded:
                notify_payment_received(payment, actor=None)
        except Exception as exc:
            event_record.processing_error = str(exc)[:2000]
            event_record.save(update_fields=["processing_error"])
            return HttpResponse(status=500)

        return HttpResponse(status=200)
