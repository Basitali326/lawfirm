from celery import shared_task


@shared_task
def send_email_notification(notification_id: str):
    # Stub: plug real email service here
    return f"Email queued for notification {notification_id}"

