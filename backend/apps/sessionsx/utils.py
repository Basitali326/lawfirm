import hashlib
from rest_framework import exceptions

def get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_user_agent(request):
    return request.META.get("HTTP_USER_AGENT", "")


def require_device_id(request):
    """
    Previously this raised when X-Device-Id was missing. To simplify clients,
    we now fall back to a deterministic device id based on IP + user agent so
    existing session logic still has a per-device key.
    """
    device_id = request.META.get("HTTP_X_DEVICE_ID") or request.COOKIES.get("device_id")
    if device_id:
        return device_id

    # Fallback: derive a stable hash for the request origin
    fingerprint = f"{get_client_ip(request) or 'ip'}|{get_user_agent(request) or 'ua'}"
    return hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:32]


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
