from django.core.exceptions import PermissionDenied

from apps.authx.models import Firm


def get_current_firm(user_or_request):
    """
    Resolve the firm for the current user.
    Accepts either a user or request. Extend here for membership logic if added later.
    """
    user = getattr(user_or_request, "user", user_or_request)
    if hasattr(user, "owned_firm") and user.owned_firm:
        return user.owned_firm
    try:
        return Firm.objects.get(owner=user)
    except Firm.DoesNotExist:
        raise PermissionDenied("No firm found for current user.")
