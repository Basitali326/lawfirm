from rest_framework import serializers

from apps.authx.models import Firm


class FirmMeSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source='owner.email', read_only=True)
    email = serializers.SerializerMethodField(read_only=True)
    owner_first_name = serializers.CharField(source='owner.first_name', read_only=True)
    owner_last_name = serializers.CharField(source='owner.last_name', read_only=True)

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
            'owner_first_name',
            'owner_last_name',
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
            if self.instance and 'name' in request.data:
                incoming_name = request.data.get('name', '').strip()
                if incoming_name and incoming_name != self.instance.name:
                    raise serializers.ValidationError({'name': 'Firm name cannot be changed.'})
            # Allow owner name updates via this serializer
            user = request.user
            first = request.data.get('owner_first_name')
            last = request.data.get('owner_last_name')
            if first is not None:
                user.first_name = first
            if last is not None:
                user.last_name = last
            user.save(update_fields=['first_name', 'last_name'])
        return super().validate(attrs)
