from rest_framework import serializers


class DashboardSummaryQuerySerializer(serializers.Serializer):
    DATE_FIELD_CREATED_AT = "created_at"
    DATE_FIELD_UPDATED_AT = "updated_at"
    DATE_FIELD_DUE_DATE = "due_date"

    DATE_FIELD_CHOICES = (
        (DATE_FIELD_CREATED_AT, "created_at"),
        (DATE_FIELD_UPDATED_AT, "updated_at"),
        (DATE_FIELD_DUE_DATE, "due_date"),
    )

    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    date_field = serializers.ChoiceField(choices=DATE_FIELD_CHOICES, required=False, default=DATE_FIELD_CREATED_AT)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if (start_date and not end_date) or (end_date and not start_date):
            raise serializers.ValidationError(
                {"date_range": ["Both start_date and end_date are required when filtering by date range."]}
            )

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"date_range": ["start_date cannot be greater than end_date."]})

        return attrs


class DashboardAnalyticsQuerySerializer(serializers.Serializer):
    year = serializers.IntegerField(required=False, min_value=2020, max_value=2100)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)

    def validate(self, attrs):
        if attrs.get("month") and not attrs.get("year"):
            raise serializers.ValidationError({"year": ["Year is required when month is selected."]})
        return attrs
