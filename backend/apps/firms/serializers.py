from rest_framework import serializers

from apps.authx.models import Firm


class FirmMeSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Firm
        fields = [
            'id',
            'name',
            'slug',
            'email',
            'phone',
            'address',
            'timezone',
            'created_at',
            'updated_at',
            'owner_email',
        ]
        read_only_fields = ('slug', 'email', 'owner_email', 'created_at', 'updated_at')

    def get_email(self, obj):
        # Prefer firm email if set, otherwise fallback to owner email for display
        return obj.email or (obj.owner.email if obj.owner else None)

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.method in ('PUT', 'PATCH'):
            if 'email' in request.data and request.data['email']:
                # Block email changes explicitly
                raise serializers.ValidationError({'email': 'Email cannot be changed here.'})
        return super().validate(attrs)
