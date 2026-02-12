from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle
from django.conf import settings


class PublicIPMinuteThrottle(SimpleRateThrottle):
    scope = "intake_public_minute"

    def get_cache_key(self, request, view):
        return self.get_ident(request)


class PublicIPHourThrottle(SimpleRateThrottle):
    scope = "intake_public_hour"

    def get_cache_key(self, request, view):
        return self.get_ident(request)


class PhoneEmailThrottle(SimpleRateThrottle):
    scope = "intake_phone_email_hour"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None
        data = request.data or {}
        phone = (data.get("phone") or "").replace(" ", "").replace("-", "")
        email = (data.get("email") or "").lower()
        token = phone or email
        if not token:
            return None
        ident = self.get_ident(request)
        return f"intake_pe:{token}:{ident}"
