from rest_framework import exceptions

def get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")


def require_device_id(request):
    device_id = request.META.get("HTTP_X_DEVICE_ID")
    if not device_id:
        raise exceptions.ValidationError({"device_id": ["X-Device-Id header required"]})
    return device_id


def get_user_firm(user):
    """
    Safely resolve firm for the current user.
    Tries user.firm, user.profile.firm, then user.owned_firm (for firm owners).
    """
    return (
        getattr(user, "firm", None)
        or getattr(getattr(user, "profile", None), "firm", None)
        or getattr(user, "owned_firm", None)
    )
