import stripe
from pathlib import Path
import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.ecommerce.models import Seller
from apps.ecommerce.permissions import IsAdminStaffOrSuperAdmin
from apps.ecommerce.services import resolve_firm
from apps.notifx.services import notify_appointment_booked, notify_ebook_sale_paid
from core.responses import api_error, api_success

from .models import (
    Article,
    ArticleCategory,
    Appointment,
    AppointmentStatus,
    AppointmentType,
    Certification,
    Ebook,
    EbookPurchase,
    EbookPurchaseStatus,
    LawyerAvailability,
    LawyerOffDay,
    LegalService,
    PublishStatus,
)
from .serializers import (
    AppointmentCheckoutSerializer,
    AppointmentSerializer,
    ArticleCategorySerializer,
    ArticleSerializer,
    CertificationSerializer,
    EbookCheckoutSerializer,
    EbookPurchaseSerializer,
    EbookSerializer,
    LawyerAvailabilitySerializer,
    LawyerOffDaySerializer,
    LegalServiceSerializer,
    SellerSerializer,
)

logger = logging.getLogger(__name__)


def stripe_metadata_value(session, key):
    metadata = getattr(session, "metadata", None)
    if not metadata:
        return None
    metadata_data = getattr(metadata, "_data", None)
    if isinstance(metadata_data, dict):
        return metadata_data.get(key)
    if isinstance(metadata, dict):
        return metadata.get(key)
    return None


class FirmModelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminStaffOrSuperAdmin]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_firm(self):
        firm = resolve_firm(self.request)
        if not firm:
            raise ValueError("Firm context not found.")
        return firm

    def perform_create(self, serializer):
        serializer.save(firm=self.get_firm())

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["firm"] = self.get_firm()
        return context

    def perform_destroy(self, instance):
        instance.soft_delete()


class SellerViewSet(FirmModelViewSet):
    serializer_class = SellerSerializer

    def get_queryset(self):
        queryset = Seller.objects.filter(firm=self.get_firm(), deleted_at__isnull=True)
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(email__icontains=search))
        return queryset.order_by("name")


class EbookViewSet(FirmModelViewSet):
    serializer_class = EbookSerializer

    def get_queryset(self):
        queryset = Ebook.objects.filter(
            firm=self.get_firm(), deleted_at__isnull=True
        ).select_related("seller")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(author__icontains=search))
        if self.request.query_params.get("status"):
            queryset = queryset.filter(status=self.request.query_params["status"])
        return queryset


class CertificationViewSet(FirmModelViewSet):
    serializer_class = CertificationSerializer

    def get_queryset(self):
        return Certification.objects.filter(
            firm=self.get_firm(), deleted_at__isnull=True
        ).order_by("sort_order", "-created_at")


class ArticleCategoryViewSet(FirmModelViewSet):
    serializer_class = ArticleCategorySerializer

    def get_queryset(self):
        return ArticleCategory.objects.filter(
            firm=self.get_firm(), deleted_at__isnull=True
        ).order_by("name")


class ArticleViewSet(FirmModelViewSet):
    serializer_class = ArticleSerializer

    def get_queryset(self):
        queryset = Article.objects.filter(
            firm=self.get_firm(), deleted_at__isnull=True
        ).select_related("category")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(excerpt__icontains=search))
        if self.request.query_params.get("status"):
            queryset = queryset.filter(status=self.request.query_params["status"])
        if self.request.query_params.get("category"):
            queryset = queryset.filter(category_id=self.request.query_params["category"])
        return queryset


def user_belongs_to_firm(user, firm):
    if not user or not firm:
        return False
    if getattr(firm, "owner_id", None) == user.id:
        return True
    return getattr(getattr(user, "profile", None), "firm_id", None) == firm.id


class LegalServiceViewSet(FirmModelViewSet):
    serializer_class = LegalServiceSerializer

    def get_queryset(self):
        queryset = LegalService.objects.filter(
            firm=self.get_firm(), deleted_at__isnull=True
        ).select_related("lawyer", "case_type")
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(short_description__icontains=search)
                | Q(case_type__name__icontains=search)
            )
        if self.request.query_params.get("status"):
            queryset = queryset.filter(status=self.request.query_params["status"])
        return queryset

    def perform_create(self, serializer):
        firm = self.get_firm()
        lawyer = serializer.validated_data.get("lawyer") or self.request.user
        if not user_belongs_to_firm(lawyer, firm):
            raise ValueError("Selected lawyer does not belong to this firm.")
        case_type = serializer.validated_data.get("case_type")
        if case_type and case_type.firm_id != firm.id:
            raise ValueError("Selected case type does not belong to this firm.")
        serializer.save(firm=firm, lawyer=lawyer)

    def perform_update(self, serializer):
        firm = self.get_firm()
        lawyer = serializer.validated_data.get("lawyer", serializer.instance.lawyer)
        if not user_belongs_to_firm(lawyer, firm):
            raise ValueError("Selected lawyer does not belong to this firm.")
        case_type = serializer.validated_data.get("case_type", serializer.instance.case_type)
        if case_type and case_type.firm_id != firm.id:
            raise ValueError("Selected case type does not belong to this firm.")
        serializer.save()


class LawyerAvailabilityViewSet(FirmModelViewSet):
    serializer_class = LawyerAvailabilitySerializer

    def get_queryset(self):
        return LawyerAvailability.objects.filter(
            firm=self.get_firm()
        ).select_related("lawyer")

    def perform_create(self, serializer):
        firm = self.get_firm()
        lawyer = serializer.validated_data.get("lawyer") or self.request.user
        if not user_belongs_to_firm(lawyer, firm):
            raise ValueError("Selected lawyer does not belong to this firm.")
        serializer.save(firm=firm, lawyer=lawyer)

    def perform_destroy(self, instance):
        instance.delete()


class LawyerOffDayViewSet(FirmModelViewSet):
    serializer_class = LawyerOffDaySerializer

    def get_queryset(self):
        return LawyerOffDay.objects.filter(
            firm=self.get_firm()
        ).select_related("lawyer")

    def perform_create(self, serializer):
        firm = self.get_firm()
        lawyer = serializer.validated_data.get("lawyer") or self.request.user
        if not user_belongs_to_firm(lawyer, firm):
            raise ValueError("Selected lawyer does not belong to this firm.")
        serializer.save(firm=firm, lawyer=lawyer)

    def perform_destroy(self, instance):
        instance.delete()


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsAdminStaffOrSuperAdmin]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        firm = resolve_firm(self.request)
        queryset = Appointment.objects.filter(firm=firm).select_related("service", "lawyer")
        if self.request.query_params.get("status"):
            queryset = queryset.filter(status=self.request.query_params["status"])
        if self.request.query_params.get("date"):
            queryset = queryset.filter(appointment_date=self.request.query_params["date"])
        return queryset


class EbookPurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EbookPurchaseSerializer
    permission_classes = [IsAuthenticated, IsAdminStaffOrSuperAdmin]

    def get_queryset(self):
        firm = resolve_firm(self.request)
        return EbookPurchase.objects.filter(firm=firm).select_related("ebook", "seller")


class PublicWebsiteDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        if not firm:
            return api_error("Firm not found", status_code=status.HTTP_404_NOT_FOUND)
        ebooks = Ebook.objects.filter(
            firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
        ).select_related("seller")[:8]
        certifications = Certification.objects.filter(
            firm=firm, deleted_at__isnull=True, is_active=True
        )[:8]
        articles = Article.objects.filter(
            firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
        ).select_related("category")[:6]
        services = LegalService.objects.filter(
            firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
        ).select_related("lawyer", "case_type")[:10]
        return api_success("Website content retrieved", data={
            "firm": {
                "name": firm.name,
                "slug": firm.slug,
                "email": firm.email,
                "phone": firm.phone,
                "address": firm.address,
            },
            "ebooks": EbookSerializer(ebooks, many=True, context={"request": request}).data,
            "certifications": CertificationSerializer(certifications, many=True, context={"request": request}).data,
            "articles": ArticleSerializer(articles, many=True, context={"request": request}).data,
            "services": LegalServiceSerializer(services, many=True, context={"request": request}).data,
        })


class PublicLegalServiceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        queryset = LegalService.objects.filter(
            firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
        ).select_related("lawyer", "case_type")
        search = str(request.query_params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(short_description__icontains=search)
                | Q(case_type__name__icontains=search)
            )
        return api_success("Legal services retrieved", data=LegalServiceSerializer(
            queryset, many=True, context={"request": request}
        ).data)


class PublicLegalServiceDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        firm = resolve_firm(request, allow_public=True)
        service = get_object_or_404(
            LegalService.objects.select_related("lawyer", "case_type"),
            firm=firm,
            slug=slug,
            deleted_at__isnull=True,
            status=PublishStatus.PUBLISHED,
        )
        return api_success("Legal service retrieved", data=LegalServiceSerializer(
            service, context={"request": request}
        ).data)


def available_slots(service, appointment_date):
    if appointment_date < timezone.localdate():
        return []
    windows = LawyerAvailability.objects.filter(
        firm=service.firm,
        lawyer=service.lawyer,
        weekday=appointment_date.weekday(),
        is_active=True,
    ).order_by("start_time")
    off_periods = LawyerOffDay.objects.filter(
        firm=service.firm,
        lawyer=service.lawyer,
        date=appointment_date,
        is_active=True,
    )
    if off_periods.filter(is_all_day=True).exists():
        return []
    booked = list(Appointment.objects.filter(
        firm=service.firm,
        lawyer=service.lawyer,
        appointment_date=appointment_date,
        status__in=[AppointmentStatus.PENDING_PAYMENT, AppointmentStatus.CONFIRMED],
    ).values_list("start_time", "end_time"))
    partial_off = list(off_periods.filter(is_all_day=False).values_list("start_time", "end_time"))
    slots = []
    now_local = timezone.localtime()
    for window in windows:
        cursor = datetime.combine(appointment_date, window.start_time)
        window_end = datetime.combine(appointment_date, window.end_time)
        duration = service.duration_minutes or window.slot_duration_minutes
        while cursor + timedelta(minutes=duration) <= window_end:
            slot_end = cursor + timedelta(minutes=duration)
            start_time = cursor.time()
            end_time = slot_end.time()
            is_past = appointment_date == now_local.date() and start_time <= now_local.time()
            overlaps_booked = any(start_time < end and end_time > start for start, end in booked)
            overlaps_off = any(
                start and end and start_time < end and end_time > start
                for start, end in partial_off
            )
            if not is_past and not overlaps_booked and not overlaps_off:
                slots.append({
                    "start_time": start_time.strftime("%H:%M"),
                    "end_time": end_time.strftime("%H:%M"),
                    "label": cursor.strftime("%I:%M %p"),
                })
            cursor = slot_end
    return slots


class PublicLegalServiceSlotsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        firm = resolve_firm(request, allow_public=True)
        service = get_object_or_404(
            LegalService,
            firm=firm,
            slug=slug,
            deleted_at__isnull=True,
            status=PublishStatus.PUBLISHED,
        )
        date_text = request.query_params.get("date")
        try:
            appointment_date = datetime.strptime(date_text or "", "%Y-%m-%d").date()
        except ValueError:
            return api_error(
                "Validation error",
                errors={"date": ["Use YYYY-MM-DD format."]},
                status_code=400,
            )
        return api_success("Available slots retrieved", data={
            "date": appointment_date.isoformat(),
            "slots": available_slots(service, appointment_date),
        })


def fulfill_appointment(appointment, payment_intent_id=""):
    if (
        appointment.status == AppointmentStatus.CONFIRMED
        and appointment.payment_status == EbookPurchaseStatus.PAID
    ):
        return
    appointment.status = AppointmentStatus.CONFIRMED
    appointment.payment_status = EbookPurchaseStatus.PAID
    appointment.paid_at = timezone.now()
    appointment.stripe_payment_intent_id = (
        payment_intent_id or appointment.stripe_payment_intent_id
    )
    appointment.save(update_fields=[
        "status", "payment_status", "paid_at",
        "stripe_payment_intent_id", "updated_at",
    ])
    notify_appointment_booked(appointment)
    date_label = appointment.appointment_date.strftime("%A, %d %B %Y")
    time_label = appointment.start_time.strftime("%I:%M %p")
    mode_label = appointment.get_appointment_type_display()
    client_message = (
        f"Hello {appointment.client_name},\n\n"
        f"Your appointment is confirmed.\n\n"
        f"Service: {appointment.service.title}\n"
        f"Lawyer: {appointment.lawyer.get_full_name().strip() or appointment.lawyer.email}\n"
        f"Date: {date_label}\n"
        f"Time: {time_label} ({appointment.firm.timezone})\n"
        f"Appointment type: {mode_label}\n"
        f"Amount paid: AED {appointment.amount_aed}\n\n"
    )
    if appointment.appointment_type == AppointmentType.ONLINE:
        client_message += (
            "The online meeting link will be added by the legal team and sent to you before the appointment.\n\n"
        )
    else:
        client_message += f"Office address: {appointment.firm.address or 'Please contact the office.'}\n\n"
    client_message += "Thank you."
    try:
        send_mail(
            subject=f"Appointment confirmed: {appointment.service.title}",
            message=client_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[appointment.client_email],
            fail_silently=False,
        )
        office_recipients = list({
            email for email in [
                appointment.firm.email,
                appointment.lawyer.email,
            ] if email
        })
        if office_recipients:
            send_mail(
                subject=f"New paid appointment: {appointment.client_name}",
                message=(
                    f"A new appointment has been paid and confirmed.\n\n"
                    f"Client: {appointment.client_name}\n"
                    f"Email: {appointment.client_email}\n"
                    f"Phone: {appointment.client_phone}\n"
                    f"Service: {appointment.service.title}\n"
                    f"Date: {date_label}\n"
                    f"Time: {time_label}\n"
                    f"Type: {mode_label}\n"
                    f"Message: {appointment.message or '-'}"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=office_recipients,
                fail_silently=False,
            )
    except Exception:
        logger.exception("Appointment confirmed but email failed for %s", appointment.id)


class AppointmentCheckoutView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = AppointmentCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=400)
        firm = resolve_firm(request, allow_public=True)
        service = get_object_or_404(
            LegalService.objects.select_for_update(),
            id=serializer.validated_data["service_id"],
            firm=firm,
            deleted_at__isnull=True,
            status=PublishStatus.PUBLISHED,
        )
        appointment_type = serializer.validated_data["appointment_type"]
        if appointment_type == AppointmentType.ONLINE and not service.supports_online:
            return api_error("Online appointments are not available for this service.", status_code=400)
        if appointment_type == AppointmentType.PHYSICAL and not service.supports_physical:
            return api_error("Physical appointments are not available for this service.", status_code=400)
        appointment_date = serializer.validated_data["appointment_date"]
        start_time = serializer.validated_data["start_time"]
        matching_slot = next(
            (slot for slot in available_slots(service, appointment_date)
             if slot["start_time"] == start_time.strftime("%H:%M")),
            None,
        )
        if not matching_slot:
            return api_error(
                "This appointment time is no longer available.",
                errors={"start_time": ["Please select another available time."]},
                status_code=409,
            )
        if not settings.STRIPE_SECRET_KEY:
            return api_error("Stripe is not configured.", status_code=503)
        appointment = Appointment.objects.create(
            firm=firm,
            service=service,
            lawyer=service.lawyer,
            client_name=serializer.validated_data["client_name"],
            client_email=serializer.validated_data["client_email"],
            client_phone=serializer.validated_data["client_phone"],
            message=serializer.validated_data.get("message", ""),
            appointment_type=appointment_type,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time=datetime.strptime(matching_slot["end_time"], "%H:%M").time(),
            amount_aed=service.price_aed,
        )
        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_version = settings.STRIPE_API_VERSION
        try:
            session = stripe.checkout.Session.create(
                mode="payment",
                customer_email=appointment.client_email,
                line_items=[{
                    "price_data": {
                        "currency": "aed",
                        "unit_amount": int(service.price_aed * 100),
                        "product_data": {
                            "name": service.title,
                            "description": (
                                f"{appointment.appointment_date} "
                                f"{appointment.start_time.strftime('%H:%M')} "
                                f"({appointment.get_appointment_type_display()})"
                            ),
                        },
                    },
                    "quantity": 1,
                }],
                metadata={
                    "appointment_id": str(appointment.id),
                    "service_id": str(service.id),
                },
                success_url=(
                    f"{settings.FRONTEND_URL}/appointments/success"
                    "?session_id={CHECKOUT_SESSION_ID}"
                ),
                cancel_url=f"{settings.FRONTEND_URL}/services/{service.slug}?cancelled=1",
            )
        except stripe.error.StripeError:
            appointment.status = AppointmentStatus.CANCELLED
            appointment.payment_status = EbookPurchaseStatus.FAILED
            appointment.save(update_fields=["status", "payment_status", "updated_at"])
            logger.exception("Unable to create appointment checkout session")
            return api_error("Unable to start secure payment.", status_code=400)
        appointment.stripe_checkout_session_id = session.id
        appointment.save(update_fields=["stripe_checkout_session_id", "updated_at"])
        return api_success("Checkout session created", data={
            "checkout_url": session.url,
            "appointment_id": str(appointment.id),
        })


class AppointmentCheckoutConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = str(request.data.get("session_id") or "").strip()
        if not session_id:
            return api_error("Stripe session ID is required.", status_code=400)
        if not settings.STRIPE_SECRET_KEY:
            return api_error("Stripe is not configured.", status_code=503)
        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_version = settings.STRIPE_API_VERSION
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError:
            return api_error("Unable to verify the Stripe payment.", status_code=400)
        appointment_id = stripe_metadata_value(session, "appointment_id")
        appointment = Appointment.objects.select_related(
            "service", "lawyer", "firm"
        ).filter(
            id=appointment_id,
            stripe_checkout_session_id=session_id,
        ).first()
        if not appointment:
            return api_error("Appointment record not found.", status_code=404)
        if session.payment_status != "paid" or session.status != "complete":
            return api_success("Payment is still processing.", data={
                "status": appointment.status,
                "payment_status": session.payment_status,
            })
        fulfill_appointment(appointment, session.payment_intent or "")
        appointment.refresh_from_db()
        return api_success("Appointment confirmed.", data=AppointmentSerializer(
            appointment, context={"request": request}
        ).data)


class PublicEbookListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        queryset = Ebook.objects.filter(
            firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
        ).select_related("seller")
        return api_success("E-books retrieved", data=EbookSerializer(
            queryset, many=True, context={"request": request}
        ).data)


class PublicEbookDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        firm = resolve_firm(request, allow_public=True)
        ebook = get_object_or_404(
            Ebook.objects.select_related("seller"),
            firm=firm, slug=slug, deleted_at__isnull=True, status=PublishStatus.PUBLISHED,
        )
        return api_success("E-book retrieved", data=EbookSerializer(
            ebook, context={"request": request}
        ).data)


class PublicArticleListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        firm = resolve_firm(request, allow_public=True)
        queryset = Article.objects.filter(
            firm=firm, deleted_at__isnull=True, status=PublishStatus.PUBLISHED
        ).select_related("category")
        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)
        return api_success("Articles retrieved", data=ArticleSerializer(
            queryset, many=True, context={"request": request}
        ).data)


class PublicArticleDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        firm = resolve_firm(request, allow_public=True)
        article = get_object_or_404(
            Article.objects.select_related("category"),
            firm=firm, slug=slug, deleted_at__isnull=True, status=PublishStatus.PUBLISHED,
        )
        return api_success("Article retrieved", data=ArticleSerializer(
            article, context={"request": request}
        ).data)


class EbookCheckoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EbookCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=400)
        firm = resolve_firm(request, allow_public=True)
        ebook = get_object_or_404(
            Ebook,
            id=serializer.validated_data["ebook_id"],
            firm=firm,
            deleted_at__isnull=True,
            status=PublishStatus.PUBLISHED,
        )
        if not settings.STRIPE_SECRET_KEY:
            return api_error("Stripe is not configured.", status_code=503)

        purchase = EbookPurchase.objects.create(
            firm=firm,
            ebook=ebook,
            seller=ebook.seller,
            buyer_name=serializer.validated_data["buyer_name"],
            buyer_email=serializer.validated_data["buyer_email"],
            amount_aed=ebook.price_aed,
        )
        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_version = settings.STRIPE_API_VERSION
        session = stripe.checkout.Session.create(
            mode="payment",
            customer_email=purchase.buyer_email,
            line_items=[{
                "price_data": {
                    "currency": "aed",
                    "unit_amount": int(ebook.price_aed * 100),
                    "product_data": {"name": ebook.title, "description": ebook.short_description[:500]},
                },
                "quantity": 1,
            }],
            metadata={"purchase_id": str(purchase.id), "ebook_id": str(ebook.id)},
            success_url=f"{settings.FRONTEND_URL}/ebooks/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/ebooks/{ebook.slug}?cancelled=1",
        )
        purchase.stripe_checkout_session_id = session.id
        purchase.save(update_fields=["stripe_checkout_session_id", "updated_at"])
        return api_success("Checkout session created", data={"checkout_url": session.url, "purchase_id": str(purchase.id)})


def fulfill_purchase(purchase, payment_intent_id=""):
    if purchase.status == EbookPurchaseStatus.PAID:
        return
    purchase.status = EbookPurchaseStatus.PAID
    purchase.paid_at = timezone.now()
    purchase.stripe_payment_intent_id = payment_intent_id or purchase.stripe_payment_intent_id
    purchase.save(update_fields=["status", "paid_at", "stripe_payment_intent_id", "updated_at"])
    notify_ebook_sale_paid(purchase)
    download_url = f"{settings.FRONTEND_URL}/ebooks/download/{purchase.download_token}"
    try:
        send_mail(
            subject=f"Your e-book: {purchase.ebook.title}",
            message=(
                f"Hello {purchase.buyer_name},\n\n"
                f"Your payment was successful. Download your e-book here:\n{download_url}\n\n"
                "Thank you."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[purchase.buyer_email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Payment recorded but delivery email failed for purchase %s", purchase.id)


class EbookCheckoutConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        session_id = str(request.data.get("session_id") or "").strip()
        if not session_id:
            return api_error("Stripe session ID is required.", status_code=400)
        if not settings.STRIPE_SECRET_KEY:
            return api_error("Stripe is not configured.", status_code=503)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_version = settings.STRIPE_API_VERSION
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError:
            return api_error("Unable to verify the Stripe payment.", status_code=400)

        purchase_id = stripe_metadata_value(session, "purchase_id")
        purchase = EbookPurchase.objects.select_related("ebook").filter(
            id=purchase_id,
            stripe_checkout_session_id=session_id,
        ).first()
        if not purchase:
            return api_error("Purchase record not found.", status_code=404)

        if session.payment_status != "paid" or session.status != "complete":
            return api_success("Payment is still processing.", data={
                "status": purchase.status,
                "payment_status": session.payment_status,
            })

        fulfill_purchase(purchase, session.payment_intent or "")
        purchase.refresh_from_db()
        return api_success("Payment confirmed.", data={
            "status": purchase.status,
            "download_url": f"{settings.FRONTEND_URL}/ebooks/download/{purchase.download_token}",
        })


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not settings.STRIPE_WEBHOOK_SECRET:
            return api_error("Stripe webhook is not configured.", status_code=503)
        try:
            event = stripe.Webhook.construct_event(
                request.body,
                request.headers.get("Stripe-Signature", ""),
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return api_error("Invalid Stripe webhook.", status_code=400)

        if event["type"] in {
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
        }:
            session = event["data"]["object"]
            metadata = session.get("metadata") or {}
            appointment_id = metadata.get("appointment_id")
            if appointment_id:
                appointment = Appointment.objects.select_related(
                    "service", "lawyer", "firm"
                ).filter(id=appointment_id).first()
                if appointment:
                    fulfill_appointment(appointment, session.get("payment_intent") or "")
            else:
                purchase_id = metadata.get("purchase_id")
                purchase = EbookPurchase.objects.select_related("ebook").filter(id=purchase_id).first()
                if purchase:
                    fulfill_purchase(purchase, session.get("payment_intent") or "")
        elif event["type"] in {
            "checkout.session.expired",
            "checkout.session.async_payment_failed",
        }:
            session = event["data"]["object"]
            appointment_id = (session.get("metadata") or {}).get("appointment_id")
            if appointment_id:
                Appointment.objects.filter(
                    id=appointment_id,
                    status=AppointmentStatus.PENDING_PAYMENT,
                ).update(
                    status=AppointmentStatus.CANCELLED,
                    payment_status=EbookPurchaseStatus.FAILED,
                    updated_at=timezone.now(),
                )
        return api_success("Webhook processed")


class EbookDownloadView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        purchase = get_object_or_404(
            EbookPurchase.objects.select_related("ebook"),
            download_token=token,
            status=EbookPurchaseStatus.PAID,
        )
        if not purchase.ebook.ebook_file:
            return api_error("E-book file is not available.", status_code=404)
        purchase.download_count += 1
        purchase.save(update_fields=["download_count", "updated_at"])
        return FileResponse(
            purchase.ebook.ebook_file.open("rb"),
            as_attachment=True,
            filename=f"{purchase.ebook.slug}{Path(purchase.ebook.ebook_file.name).suffix}",
        )
