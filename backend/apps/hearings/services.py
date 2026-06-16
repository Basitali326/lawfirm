from types import SimpleNamespace
from datetime import datetime
from django.db import transaction
from django.db import models
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.cases.models import Case
from apps.cases.permissions import CasePermission
from apps.cases.utils import get_user_firm
from apps.hearings.models import CaseHearing, HearingStatus
from apps.rbac.services import user_has_perm
from apps.audit.services import log_audit_event
from apps.audit.models import EntityType, AuditAction
from apps.notifx.services import notify_hearing_scheduled

MANAGE_CODE = "case.hearings.manage"
VIEW_CODE = "hearings.view"


def _user_role(user):
    profile = getattr(user, "profile", None)
    raw = (getattr(user, "role", "") or getattr(profile, "role", "") or "")
    # Normalize roles like "Firm owner" or "Firm Owner" -> "FIRM_OWNER"
    return raw.replace(" ", "_").upper()


def _ensure_case_access(user, case, method="GET"):
    req = SimpleNamespace(user=user, method=method)
    cp = CasePermission()
    if not cp.has_object_permission(req, None, case):
        raise PermissionDenied("Forbidden")


def _ensure_manage(user):
    if user_has_perm(user, MANAGE_CODE):
        return
    role = _user_role(user)
    if role in {"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER"} or getattr(user, "owned_firm", None):
        return
    raise PermissionDenied("Forbidden")


def _ensure_view(user):
    if user_has_perm(user, VIEW_CODE):
        return
    role = _user_role(user)
    if role in {"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER"} or getattr(user, "owned_firm", None):
        return
    raise PermissionDenied("Forbidden")


def _get_case_for_user(user, case_id):
    firm = get_user_firm(user)
    if not firm:
        raise PermissionDenied("User firm not set")
    case = (
        Case.objects.select_related("firm", "assigned_lead", "client")
        .filter(id=case_id, firm=firm, is_deleted=False)
        .first()
    )
    if not case:
        raise NotFound("Case not found")
    return case, firm


def create_hearing(user, case_id, payload):
    case, firm = _get_case_for_user(user, case_id)
    _ensure_case_access(user, case, method="POST")
    _ensure_manage(user)
    with transaction.atomic():
        hearing = CaseHearing.objects.create(
            firm=firm,
            case=case,
            created_by=user,
            updated_by=user,
            **payload,
        )
        notify_hearing_scheduled(hearing, actor=user)
        try:
            log_audit_event(
                request=None,
                firm=firm,
                actor=user,
                entity_type=EntityType.CASE,
                entity_id=case.id,
                action=AuditAction.CREATED,
                message=f"Hearing created: {hearing.title}",
                metadata={"hearing_id": str(hearing.id), "status": hearing.status},
            )
        except Exception:
            pass
    return hearing


def list_case_hearings(user, case_id, filters):
    case, firm = _get_case_for_user(user, case_id)
    _ensure_case_access(user, case, method="GET")
    _ensure_view(user)
    qs = (
        CaseHearing.objects.filter(case=case, firm=firm, is_deleted=False)
        .select_related("case", "created_by", "updated_by")
        .order_by("-start_at")
    )
    status_val = filters.get("status")
    if status_val:
        qs = qs.filter(status=status_val)
    from_dt = filters.get("from")
    to_dt = filters.get("to")
    if from_dt:
        qs = qs.filter(start_at__gte=from_dt)
    if to_dt:
        qs = qs.filter(start_at__lte=to_dt)
    return qs


def list_hearings(user, filters):
    firm = get_user_firm(user)
    if not firm:
        raise PermissionDenied("User firm not set")
    _ensure_view(user)

    role = _user_role(user)
    rbac_roles = set()
    try:
        rbac_roles = {
            (r or "").replace(" ", "_").upper()
            for r in user.user_roles.select_related("role").values_list("role__name", flat=True)
            if r
        }
    except Exception:
        rbac_roles = set()

    qs = (
        CaseHearing.objects.filter(firm=firm, is_deleted=False, case__is_deleted=False)
        .select_related("case", "created_by", "updated_by")
        .order_by("-start_at", "-created_at")
    )

    if role in {"LAWYER", "PARALEGAL", "VIEWER"} or rbac_roles.intersection({"LAWYER", "PARALEGAL", "VIEWER"}):
        qs = qs.filter(case__assigned_lead=user)
    elif role == "CLIENT" or "CLIENT" in rbac_roles:
        qs = qs.filter(case__client__user=user)

    status_val = filters.get("status")
    if status_val:
        qs = qs.filter(status=status_val)
    from_dt = filters.get("from")
    to_dt = filters.get("to")
    if from_dt:
        qs = qs.filter(start_at__gte=from_dt)
    if to_dt:
        qs = qs.filter(start_at__lte=to_dt)
    case_id = filters.get("case_id")
    if case_id:
        qs = qs.filter(case_id=case_id)
    search = (filters.get("search") or "").strip()
    if search:
        qs = qs.filter(
            models.Q(title__icontains=search)
            | models.Q(case__title__icontains=search)
            | models.Q(case__case_number__icontains=search)
            | models.Q(court_name__icontains=search)
        )
    return qs


def get_hearing(user, hearing_id):
    firm = get_user_firm(user)
    if not firm:
        raise PermissionDenied("User firm not set")
    hearing = (
        CaseHearing.objects.select_related("case", "case__firm", "created_by", "updated_by")
        .filter(id=hearing_id, firm=firm, is_deleted=False)
        .first()
    )
    if not hearing:
        raise NotFound("Hearing not found")
    _ensure_view(user)
    _ensure_case_access(user, hearing.case, method="GET")
    return hearing


def update_hearing(user, hearing_id, payload):
    hearing = get_hearing(user, hearing_id)
    _ensure_manage(user)
    for field, value in payload.items():
        setattr(hearing, field, value)
    hearing.updated_by = user
    hearing.updated_at = timezone.now()
    hearing.save()
    try:
        log_audit_event(
            request=None,
            firm=hearing.firm,
            actor=user,
            entity_type=EntityType.CASE,
            entity_id=hearing.case_id,
            action=AuditAction.UPDATED,
            message=f"Hearing updated: {hearing.title}",
            metadata={"hearing_id": str(hearing.id), "changes": list(payload.keys())},
        )
    except Exception:
        pass
    return hearing


def delete_hearing(user, hearing_id):
    hearing = get_hearing(user, hearing_id)
    _ensure_manage(user)
    hearing.soft_delete()
    try:
        log_audit_event(
            request=None,
            firm=hearing.firm,
            actor=user,
            entity_type=EntityType.CASE,
            entity_id=hearing.case_id,
            action=AuditAction.DELETED,
            message=f"Hearing deleted: {hearing.title}",
            metadata={"hearing_id": str(hearing.id)},
        )
    except Exception:
        pass
    return hearing
