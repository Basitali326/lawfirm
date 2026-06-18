import stripe
from pathlib import Path
import logging

from django.conf import settings
from django.core.mail import send_mail
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
from core.responses import api_error, api_success

from .models import (
    Article,
    ArticleCategory,
    Certification,
    Ebook,
    EbookPurchase,
    EbookPurchaseStatus,
    PublishStatus,
)
from .serializers import (
    ArticleCategorySerializer,
    ArticleSerializer,
    CertificationSerializer,
    EbookCheckoutSerializer,
    EbookPurchaseSerializer,
    EbookSerializer,
    SellerSerializer,
)

logger = logging.getLogger(__name__)


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
        })


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

        metadata = getattr(session, "metadata", None)
        metadata_data = getattr(metadata, "_data", {}) if metadata else {}
        purchase_id = metadata_data.get("purchase_id")
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

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            purchase_id = (session.get("metadata") or {}).get("purchase_id")
            purchase = EbookPurchase.objects.select_related("ebook").filter(id=purchase_id).first()
            if purchase:
                fulfill_purchase(purchase, session.get("payment_intent") or "")
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
