from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from apps.audit.services import log_audit_event
from apps.audit.models import EntityType, AuditAction
from .models import UserSession, SessionStatus
from .utils import get_user_firm

EXEMPT_ROLES = {"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER", "CLIENT"}

def is_exempt(user):
    # Superusers or firm owners bypass device/session approval
    if getattr(user, "is_superuser", False):
        return True
    if getattr(user, "owned_firm", None):
        return True
    raw = (getattr(user, "role", "") or "")
    normalized = raw.upper().replace("-", "_").replace(" ", "_")
    return normalized in EXEMPT_ROLES

@transaction.atomic
def handle_login(user, firm, device_id, ip, ua):
    if is_exempt(user):
        return "ALLOW", None

    active = (
        UserSession.objects.select_for_update()
        .filter(user=user, status=SessionStatus.ACTIVE)
        .first()
    )

    if not active:
        sess = UserSession.objects.create(
            user=user,
            firm=firm,
            device_id=device_id,
            status=SessionStatus.ACTIVE,
            ip_address=ip,
            user_agent=ua,
            requested_at=timezone.now(),
        )
        _log(sess, AuditAction.CREATED, "SESSION_CREATED")
        return "ALLOW", sess

    if active.device_id == device_id:
        active.last_seen_at = timezone.now()
        active.save(update_fields=["last_seen_at"])
        return "ALLOW", active

    pending = UserSession.objects.create(
        user=user,
        firm=firm,
        device_id=device_id,
        status=SessionStatus.PENDING,
        ip_address=ip,
        user_agent=ua,
        requested_at=timezone.now(),
        reason="Device switch requested",
    )
    _log(pending, AuditAction.CREATED, "SESSION_SWITCH_REQUESTED")
    return "PENDING", pending

def approve_session(session_id, approver):
    firm = get_user_firm(approver)
    sess = get_object_or_404(UserSession, id=session_id, firm=firm)
    if sess.status != SessionStatus.PENDING:
        return None
    with transaction.atomic():
        UserSession.objects.select_for_update().filter(
            user=sess.user, status=SessionStatus.ACTIVE
        ).update(status=SessionStatus.REVOKED, revoked_at=timezone.now(), approved_by=approver)
        sess.status = SessionStatus.ACTIVE
        sess.approved_at = timezone.now()
        sess.approved_by = approver
        sess.save(update_fields=["status", "approved_at", "approved_by"])
        _log(sess, AuditAction.STATUS_CHANGED, "SESSION_APPROVED")
        return sess

def deny_session(session_id, approver):
    firm = get_user_firm(approver)
    sess = get_object_or_404(UserSession, id=session_id, firm=firm)
    if sess.status != SessionStatus.PENDING:
        return None
    sess.status = SessionStatus.DENIED
    sess.approved_at = timezone.now()
    sess.approved_by = approver
    sess.save(update_fields=["status", "approved_at", "approved_by"])
    _log(sess, AuditAction.STATUS_CHANGED, "SESSION_DENIED")
    return sess

def _log(sess, action, message):
    try:
        log_audit_event(
            firm=sess.firm,
            actor=sess.approved_by or sess.user,
            entity_type=EntityType.USER,
            entity_id=str(sess.user_id),
            action=action,
            message=message,
            metadata={
                "session_id": str(sess.id),
                "device_id": sess.device_id,
                "ip": sess.ip_address,
                "user_agent": sess.user_agent,
                "status": sess.status,
            },
        )
    except Exception:
        pass
