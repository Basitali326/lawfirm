from django.core.mail import send_mail
from django.conf import settings


def send_invite_email(email, firm_name, link):
    subject = f"You're invited to {firm_name}"
    body = (
        f"Hello,\n\nYou've been invited to {firm_name}. "
        f"Set your password here: {link}\nThis link expires in 1 hour.\n\nThanks"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)
