import logging
from typing import Dict

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_templated_email(subject: str, to_email: str, template_html: str, template_txt: str, context: Dict):
  """
  Render templates and send a multipart email.
  """
  try:
    text_body = render_to_string(template_txt, context)
    html_body = render_to_string(template_html, context)
    message = EmailMultiAlternatives(subject, text_body, settings.DEFAULT_FROM_EMAIL, [to_email])
    message.attach_alternative(html_body, "text/html")
    message.send()
  except Exception as exc:  # pragma: no cover - errors are logged
    logger.error("Failed to send email to %s: %s", to_email, exc, exc_info=True)
    raise Exception("Failed to send email") from exc


def send_verification_email(user, token: str):
  verify_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
  context = {
    "user": user,
    "verify_link": verify_link,
  }
  send_templated_email(
    subject="Verify your email",
    to_email=user.email,
    template_html="emails/verify_email.html",
    template_txt="emails/verify_email.txt",
    context=context,
  )
