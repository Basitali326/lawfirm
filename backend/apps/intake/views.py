from django.shortcuts import get_object_or_404
from rest_framework import status, mixins, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from core.responses import api_success, api_error
from apps.authx.models import Firm
from apps.intake.models import IntakeRequest, IntakeStatus
from apps.intake.serializers import PublicIntakeSerializer, IntakeSerializer, IntakeUpdateSerializer
from apps.intake.permissions import IntakePermission
from apps.intake.filters import IntakeRequestFilter
from apps.intake.throttles import PublicIPMinuteThrottle, PublicIPHourThrottle, PhoneEmailThrottle
from apps.intake.services import verify_recaptcha, normalize_phone, is_duplicate_recent
from apps.audit.services import log_audit_event
from apps.audit.models import EntityType, AuditAction


class IntakePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        meta = {
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "total": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
            "has_next": self.page.has_next(),
            "has_prev": self.page.has_previous(),
        }
        return api_success("OK", data=data, meta=meta)


class PublicIntakeRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicIPMinuteThrottle, PublicIPHourThrottle, PhoneEmailThrottle]

    def post(self, request, firm_slug):
        firm = get_object_or_404(Firm, slug=firm_slug)
        serializer = PublicIntakeSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        if data.get("website"):  # honeypot
            IntakeRequest.objects.create(
                firm=firm,
                full_name=data.get("full_name", ""),
                email=data.get("email"),
                phone=data.get("phone"),
                case_type=data.get("case_type"),
                message=data.get("message", ""),
                city=data.get("city"),
                preferred_contact_time=data.get("preferred_contact_time"),
                client_ip=self._ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT"),
                is_spam=True,
                spam_score=0.0,
            )
            return api_success("OK", data={"status": "received"}, status_code=status.HTTP_201_CREATED)

        ok, score, err = verify_recaptcha(data.get("recaptcha_token"), self._ip(request))
        if not ok:
            return api_error("Recaptcha failed", errors={"recaptcha": [err or "failed"]}, status_code=status.HTTP_403_FORBIDDEN)

        phone_norm = normalize_phone(data["phone"])
        if is_duplicate_recent(firm.id, phone_norm, data.get("message")):
            return api_error("Duplicate request", status_code=status.HTTP_409_CONFLICT)

        intake = IntakeRequest.objects.create(
            firm=firm,
            full_name=data["full_name"],
            email=data.get("email"),
            phone=phone_norm,
            case_type=data.get("case_type"),
            message=data.get("message", ""),
            city=data.get("city"),
            preferred_contact_time=data.get("preferred_contact_time"),
            client_ip=self._ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            spam_score=score,
        )
        try:
            log_audit_event(
                request=None,
                firm=firm,
                actor=None,
                entity_type=EntityType.OTHER,
                entity_id=intake.id,
                action=AuditAction.CREATED,
                message="Public intake submitted",
                metadata={"source": intake.source, "status": intake.status},
            )
        except Exception:
            pass
        return api_success(
            "OK",
            data={"id": str(intake.id), "status": intake.status, "created_at": intake.created_at},
            status_code=status.HTTP_201_CREATED,
        )

    def _ip(self, request):
        xff = request.META.get("HTTP_X_FORWARDED_FOR")
        if xff:
            return xff.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class IntakeRequestViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = IntakeSerializer
    permission_classes = [IntakePermission]
    pagination_class = IntakePagination
    filterset_class = IntakeRequestFilter
    ordering = ["-created_at"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        firm_id = getattr(user, "firm_id", None) or getattr(getattr(user, "profile", None), "firm_id", None) or getattr(
            getattr(user, "owned_firm", None), "id", None
        )
        qs = IntakeRequest.objects.filter(firm_id=firm_id, is_deleted=False)
        role = (getattr(user, "role", "") or getattr(getattr(user, "profile", None), "role", "") or "").upper()
        if role == "LAWYER":
            qs = qs.filter(assigned_to=user)
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance)
        return api_success("OK", data=serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return api_success("OK", data=serializer.data)

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return IntakeUpdateSerializer
        return IntakeSerializer

    def destroy(self, request, *args, **kwargs):
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        instance.soft_delete()
        return api_success("OK", data={"id": str(instance.id)})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = get_object_or_404(self.get_queryset(), id=kwargs.get("pk"))
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return api_success("OK", data=IntakeSerializer(instance).data)


class IntakeConvertAPIView(APIView):
    permission_classes = [IntakePermission]

    def post(self, request, pk):
        instance = get_object_or_404(IntakeRequest, id=pk, is_deleted=False)
        if instance.status not in {IntakeStatus.QUALIFIED, IntakeStatus.CONTACTED, IntakeStatus.NEW}:
            return api_error("Validation error", errors={"status": ["Must be Approved/Qualified to convert"]}, status_code=status.HTTP_400_BAD_REQUEST)

        full_name = request.data.get("full_name") or instance.full_name
        email = request.data.get("email") or instance.email
        phone = request.data.get("phone") or instance.phone

        created_user_id = None
        created_password = None
        try:
            from django.contrib.auth import get_user_model
            from django.utils.crypto import get_random_string
            from apps.authx.models import UserProfile
            from apps.rbac.models import Role, UserRole

            User = get_user_model()
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email or phone,
                    "first_name": (full_name or "").split(" ")[0],
                    "last_name": " ".join((full_name or "").split(" ")[1:]),
                    "is_active": True,
                },
            )
            if created:
                # set a default login password for new clients
                temp_password = "Abcd.@123456"
                user.set_password(temp_password)
                created_password = temp_password
                user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = profile.role or "CLIENT"
            profile.firm = instance.firm
            profile.save(update_fields=["role", "firm"])

            # Ensure a CLIENT role exists in RBAC and assign it
            client_role, _ = Role.objects.get_or_create(
                firm=instance.firm,
                name="Client",
                defaults={"description": "Client role", "is_system": True},
            )
            UserRole.objects.get_or_create(user=user, role=client_role)

            created_user_id = user.id
        except Exception:
            # fail silently; conversion still proceeds
            created_user_id = None

        instance.status = IntakeStatus.CONVERTED
        instance.save(update_fields=["status", "updated_at"])
        return api_success(
            "Converted",
            data={
                "id": str(instance.id),
                "status": instance.status,
                "user_id": created_user_id,
                "temp_password": created_password,
            },
        )
