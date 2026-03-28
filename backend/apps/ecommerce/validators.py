from pathlib import Path

from django.conf import settings
from rest_framework import serializers


DEFAULT_ALLOWED_IMAGE_EXTENSIONS = ("png", "jpg", "jpeg", "webp")
DEFAULT_MAX_MEDIA_MB = 5


def validate_product_media_file(uploaded_file):
    extension = Path(uploaded_file.name or "").suffix.lower().lstrip(".")
    allowed = getattr(settings, "ECOMMERCE_ALLOWED_IMAGE_EXTENSIONS", DEFAULT_ALLOWED_IMAGE_EXTENSIONS)
    if extension not in allowed:
        raise serializers.ValidationError(
            f"Unsupported file type. Allowed: {', '.join(sorted(allowed))}."
        )

    max_mb = getattr(settings, "ECOMMERCE_MAX_IMAGE_SIZE_MB", DEFAULT_MAX_MEDIA_MB)
    max_bytes = max_mb * 1024 * 1024
    if uploaded_file.size > max_bytes:
        raise serializers.ValidationError(f"File size must be <= {max_mb} MB.")

    return uploaded_file

