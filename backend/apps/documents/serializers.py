from rest_framework import serializers

from apps.documents.models import CaseDocument


class CaseDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_detail = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CaseDocument
        fields = [
            "id",
            "case",
            "task",
            "title",
            "original_name",
            "mime_type",
            "extension",
            "size_bytes",
            "checksum_sha256",
            "uploaded_by_detail",
            "file_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_uploaded_by_detail(self, obj):
        user = obj.uploaded_by
        if not user:
            return None
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or user.email
        return {"id": user.id, "name": name, "email": user.email}

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class UploadDocumentSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
    title = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)

