from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.responses import api_error, api_success
from apps.dashboard.api.serializers import DashboardSummaryQuerySerializer
from apps.dashboard.services.dashboard_service import DashboardSummaryError, get_dashboard_summary


class DashboardSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = DashboardSummaryQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return api_error(
                "Validation error",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        validated = serializer.validated_data

        try:
            result = get_dashboard_summary(
                user=request.user,
                start_date=validated.get("start_date"),
                end_date=validated.get("end_date"),
                date_field=validated.get("date_field", DashboardSummaryQuerySerializer.DATE_FIELD_CREATED_AT),
            )
            return api_success(
                message="Dashboard summary fetched successfully",
                data={"cards": result["cards"]},
                meta=result["meta"],
            )
        except DashboardSummaryError as exc:
            return api_error(
                message=str(exc),
                errors=exc.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return api_error(
                message="Failed to fetch dashboard summary",
                errors={"detail": ["Unexpected server error."]},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

