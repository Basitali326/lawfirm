import requests
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from apps.intake.models import IntakeRequest, IntakeStatus


def verify_recaptcha(token: str, remoteip: str = None):
    if not settings.RECAPTCHA_ENABLED:
        return True, None, None
    secret = settings.RECAPTCHA_SECRET_KEY
    if not secret:
        return False, None, "Recaptcha misconfigured"
    data = {"secret": secret, "response": token}
    if remoteip:
        data["remoteip"] = remoteip
    resp = requests.post("https://www.google.com/recaptcha/api/siteverify", data=data, timeout=5)
    if resp.status_code != 200:
        return False, None, "Recaptcha request failed"
    body = resp.json()
    if not body.get("success"):
        return False, None, "Recaptcha failed"
    score = body.get("score")
    action = body.get("action")
    if settings.RECAPTCHA_VERSION == "v3":
        if score is not None and score < settings.RECAPTCHA_V3_MIN_SCORE:
            return False, score, "Low score"
        expected_action = settings.RECAPTCHA_V3_EXPECTED_ACTION
        if expected_action and action and action != expected_action:
            return False, score, "Invalid action"
    return True, score, None


def normalize_phone(phone: str):
    return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")


def is_duplicate_recent(firm_id, phone, message, window_minutes=10):
    now = timezone.now()
    recent = now - timezone.timedelta(minutes=window_minutes)
    qs = IntakeRequest.objects.filter(firm_id=firm_id, phone=phone, created_at__gte=recent, is_deleted=False)
    if message:
        qs = qs.filter(message__icontains=message[:20])
    return qs.exists()
