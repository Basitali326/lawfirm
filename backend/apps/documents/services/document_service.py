import hashlib
import mimetypes
from pathlib import Path

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from apps.billing.payment_guard import ensure_case_is_open_and_paid
from apps.documents.models import CaseDocument


def get_allowed_extensions():
    return {ext.lower().lstrip(".") for ext in getattr(settings, "DOCUMENT_ALLOWED_EXTENSIONS", [])}


def get_allowed_mime_types():
    return set(getattr(settings, "DOCUMENT_ALLOWED_MIME_TYPES", []))


def get_max_size_bytes():
    return int(getattr(settings, "DOCUMENT_MAX_SIZE_BYTES", 5 * 1024 * 1024))


def _guess_mime_from_name(name):
    guessed, _ = mimetypes.guess_type(name or "")
    return guessed


def _sha256(file_obj):
    hasher = hashlib.sha256()
    for chunk in file_obj.chunks():
        hasher.update(chunk)
    digest = hasher.hexdigest()
    file_obj.seek(0)
    return digest


def validate_upload_file(uploaded_file):
    if not uploaded_file:
        raise serializers.ValidationError({"file": "File is required."})

    max_size = get_max_size_bytes()
    if uploaded_file.size > max_size:
        raise serializers.ValidationError({"file": f"Max file size is {max_size // (1024 * 1024)} MB."})

    suffix = Path(uploaded_file.name or "").suffix.lower().lstrip(".")
    allowed_exts = get_allowed_extensions()
    if not suffix or suffix not in allowed_exts:
        raise serializers.ValidationError({"file": "Unsupported file extension."})

    content_type = (uploaded_file.content_type or "").split(";")[0].strip().lower()
    allowed_mimes = get_allowed_mime_types()
    guessed = (_guess_mime_from_name(uploaded_file.name) or "").lower()

    if content_type in {"", "application/octet-stream"} and guessed in allowed_mimes:
        content_type = guessed

    if content_type not in allowed_mimes:
        raise serializers.ValidationError({"file": "Unsupported MIME type."})
    if guessed and guessed not in allowed_mimes:
        raise serializers.ValidationError({"file": "File extension and MIME type mismatch."})

    return {
        "extension": suffix,
        "mime_type": content_type,
    }


def create_case_document(*, request_user, firm, case, uploaded_file, title=None, task=None):
    ensure_case_is_open_and_paid(firm=firm, case=case)
    if task and task.case_id != case.id:
        raise serializers.ValidationError({"task": "Task does not belong to the selected case."})

    validated = validate_upload_file(uploaded_file)
    checksum = _sha256(uploaded_file)

    return CaseDocument.objects.create(
        firm=firm,
        case=case,
        task=task,
        uploaded_by=request_user,
        title=(title or "").strip() or None,
        file=uploaded_file,
        original_name=uploaded_file.name,
        mime_type=validated["mime_type"],
        extension=validated["extension"],
        size_bytes=uploaded_file.size,
        checksum_sha256=checksum,
        is_active=True,
    )


def soft_delete_document(doc):
    doc.is_active = False
    doc.deleted_at = timezone.now()
    doc.save(update_fields=["is_active", "deleted_at", "updated_at"])
