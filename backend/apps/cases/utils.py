import logging
from typing import Any, Optional
from rest_framework import status as drf_status
from rest_framework.response import Response

from apps.authx.models import Firm

logger = logging.getLogger(__name__)


def api_response(success: bool, message: str, data: Any = None, errors: Any = None, status: int = drf_status.HTTP_200_OK):
    """Return payload in the mandated envelope."""
    payload = {
        "success": success,
        "message": message,
        "data": data if data is not None else None,
        "errors": errors if errors is not None else None,
    }
    return Response(payload, status=status)


def get_user_firm(user: Any) -> Optional[Firm]:
    """
    Best-effort way to fetch a user's firm while keeping compatibility
    with varying user <-> firm relations.
    """
    if not user:
        return None
    if getattr(user, "firm", None) is not None:
        return getattr(user, "firm")
    firm_id = getattr(user, "firm_id", None)
    if firm_id:
        try:
            return Firm.objects.get(id=firm_id)
        except Firm.DoesNotExist:
            return None
    owned = getattr(user, "owned_firm", None)
    if owned:
        return owned
    return None
