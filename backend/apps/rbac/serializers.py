from rest_framework import serializers

from apps.rbac.models import Permission, Role, RolePermission, UserRole


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "module", "action", "code", "label", "description", "is_active"]


class PermissionModuleSerializer(serializers.Serializer):
    module = serializers.CharField()
    permissions = PermissionSerializer(many=True)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description", "is_system", "created_at", "updated_at"]
        read_only_fields = ["is_system", "created_at", "updated_at"]

    def validate_name(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Name is required.")
        # normalize to Title Case for consistency
        value = value.title()
        from apps.cases.utils import get_user_firm

        firm = get_user_firm(self.context["request"].user)
        qs = Role.objects.filter(firm=firm, name=value, is_deleted=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Role with this name already exists.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        from apps.cases.utils import get_user_firm

        firm = get_user_firm(user)
        if firm is None:
            raise serializers.ValidationError({"detail": "User firm not set"})
        validated_data["firm"] = firm
        return super().create(validated_data)


class RolePermissionUpdateSerializer(serializers.Serializer):
    permission_codes = serializers.ListField(child=serializers.CharField(), allow_empty=True)


class RolePermissionListSerializer(serializers.Serializer):
    permission_codes = serializers.ListField(child=serializers.CharField())


class UserRoleUpdateSerializer(serializers.Serializer):
    role_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=True)


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    permissions = serializers.ListField(child=serializers.CharField())

    def get_name(self, obj):
        return getattr(obj, "get_full_name", lambda: obj.email)() or obj.email

    def get_roles(self, obj):
        return list(obj.user_roles.filter(role__is_deleted=False).values_list("role__name", flat=True))
