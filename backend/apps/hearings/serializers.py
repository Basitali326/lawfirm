from rest_framework import serializers

from apps.hearings.models import CaseHearing, HearingType, HearingStatus
from apps.cases.utils import get_user_firm


class CaseHearingSerializer(serializers.ModelSerializer):
    created_by_detail = serializers.SerializerMethodField()
    updated_by_detail = serializers.SerializerMethodField()

    class Meta:
        model = CaseHearing
        fields = [
            "id",
            "case",
            "title",
            "hearing_type",
            "start_at",
            "end_at",
            "court_name",
            "court_room",
            "location",
            "status",
            "notes",
            "created_by",
            "updated_by",
            "created_by_detail",
            "updated_by_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = (
            "id",
            "case",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "created_by_detail",
            "updated_by_detail",
        )
        extra_kwargs = {
            "case": {"read_only": True},
        }

    def validate(self, attrs):
        start_at = attrs.get("start_at") or getattr(self.instance, "start_at", None)
        end_at = attrs.get("end_at") or getattr(self.instance, "end_at", None)
        if start_at and end_at and end_at < start_at:
            raise serializers.ValidationError({"end_at": "End time must be after start time"})

        status_val = attrs.get("status")
        if status_val and status_val not in HearingStatus.values:
            raise serializers.ValidationError({"status": "Invalid status"})

        hearing_type_val = attrs.get("hearing_type")
        if hearing_type_val and hearing_type_val not in HearingType.values:
            raise serializers.ValidationError({"hearing_type": "Invalid hearing type"})

        request = self.context.get("request")
        firm = get_user_firm(getattr(request, "user", None)) if request else None
        case = attrs.get("case") or getattr(self.instance, "case", None)
        if case and firm and getattr(case, "firm_id", None) != getattr(firm, "id", None):
            raise serializers.ValidationError({"case": "Cross-tenant access denied"})
        if self.instance and "case" in attrs and attrs["case"].id != self.instance.case_id:
            raise serializers.ValidationError({"case": "Cannot change case for a hearing"})
        return attrs

    def get_created_by_detail(self, obj):
        return self._user_detail(getattr(obj, "created_by", None))

    def get_updated_by_detail(self, obj):
        return self._user_detail(getattr(obj, "updated_by", None))

    def _user_detail(self, user):
        if not user:
            return None
        name = f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or getattr(user, "email", "")
        return {"id": user.id, "name": name, "email": getattr(user, "email", None)}
