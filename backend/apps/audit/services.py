from typing import Optional

from django.utils import timezone
from django.http import HttpRequest

from apps.audit.models import AuditLog, EntityType, AuditAction


def _extract_client_ip(request: HttpRequest) -> Optional[str]:
    if not request:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _extract_user_agent(request: HttpRequest) -> Optional[str]:
    if not request:
        return None
    return request.META.get("HTTP_USER_AGENT")


def log_audit_event(
    *,
    request: HttpRequest = None,
    firm=None,
    actor=None,
    entity_type: str,
    entity_id: str,
    action: str,
    message: str = None,
    metadata: Optional[dict] = None,
):
    """
    Create an AuditLog entry.

    - If request is provided, firm/actor/ip/user_agent are inferred.
    - If firm is still missing, fall back to actor.firm or actor.profile.firm.
    - Raises ValueError when firm cannot be determined.
    """
    metadata = metadata or {}

    if request:
        actor = actor or getattr(request, "user", None)
        firm = firm or getattr(getattr(request, "user", None), "firm", None) or getattr(
            getattr(getattr(request, "user", None), "profile", None), "firm", None
        )
        ip_address = _extract_client_ip(request)
        user_agent = _extract_user_agent(request)
    else:
        ip_address = None
        user_agent = None

    if not firm and actor:
        firm = getattr(actor, "firm", None) or getattr(getattr(actor, "profile", None), "firm", None)

    if not firm:
        raise ValueError("firm is required for audit logging")

    return AuditLog.objects.create(
        firm=firm,
        actor=actor,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        message=message,
        metadata=metadata,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=timezone.now(),
    )


# Example usage:
# log_audit_event(request=request, entity_type=EntityType.CASE, entity_id=case.id, action=AuditAction.CREATED, message="Case created")
# log_audit_event(request=request, entity_type=EntityType.CASE, entity_id=case.id, action=AuditAction.STATUS_CHANGED, metadata={"from": "OPEN", "to": "CLOSED"})
# log_audit_event(request=request, entity_type=EntityType.DOCUMENT, entity_id=document.id, action=AuditAction.UPLOADED, message=document.filename)
# log_audit_event(actor=user, firm=user.firm, entity_type=EntityType.AUTH, entity_id=user.id, action=AuditAction.LOGIN, message="Login success")
