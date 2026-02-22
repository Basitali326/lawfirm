from django.core.mail import send_mail
from django.conf import settings


def send_invite_email(email, firm_name, link):
    subject = f"You're invited to {firm_name}"
    body = (
        f"Hello,\n\nYou've been invited to {firm_name}. "
        f"Set your password here: {link}\nThis link expires in 1 hour.\n\nThanks"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)


def send_new_user_credentials(email, firm_name, login_url, password):
    subject = f"Your {firm_name} account is ready"
    body = (
        f"Hello,\n\n"
        f"An account has been created for you in {firm_name}.\n\n"
        f"Login: {email}\n"
        f"Temporary password: {password}\n"
        f"Login here: {login_url}\n\n"
        f"Please sign in and change your password immediately.\n\n"
        f"Thanks"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=True)
