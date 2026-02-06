import secrets
from datetime import timedelta

from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .models import EmailOTP, UserProfile


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_email_otp(user, purpose: str = "email_verification") -> EmailOTP:
    code = generate_otp()
    otp = EmailOTP.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    return otp


def send_email_otp(user, code: str):
    subject = "Your verification code"
    body = f"Your OTP is {code}. It expires in 10 minutes."
    # Always log OTP to server console for dev visibility
    print(f"[OTP] user={user.email} code={code}")
    # Only send email when enabled (see OTP_EMAIL_ENABLED in settings)
    if getattr(settings, "OTP_EMAIL_ENABLED", False):
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email])


def ensure_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"email_verified": False})
    return profile
