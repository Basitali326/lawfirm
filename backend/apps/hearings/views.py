from datetime import datetime
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.exceptions import ValidationError

from core.responses import api_success, api_error
from apps.hearings.serializers import CaseHearingSerializer
from apps.hearings.services import (
    create_hearing,
    list_case_hearings,
    get_hearing,
    update_hearing,
    delete_hearing,
)


class HearingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CaseHearingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        filters = {}
        status_param = request.query_params.get("status")
        if status_param:
            filters["status"] = status_param
        from_param = request.query_params.get("from")
        to_param = request.query_params.get("to")
        if from_param:
            parsed = parse_datetime(from_param)
            if parsed:
                filters["from"] = parsed
        if to_param:
            parsed = parse_datetime(to_param)
            if parsed:
                filters["to"] = parsed

        qs = list_case_hearings(request.user, case_id, filters)
        paginator = HearingPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CaseHearingSerializer(page or qs, many=True)
        meta = None
        if page is not None:
            meta = {
                "page": paginator.page.number,
                "page_size": paginator.get_page_size(request),
                "count": paginator.page.paginator.count,
                "total_pages": paginator.page.paginator.num_pages,
            }
        return api_success("Hearings retrieved", data=serializer.data, meta=meta)

    def post(self, request, case_id):
        serializer = CaseHearingSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        hearing = create_hearing(request.user, case_id, serializer.validated_data)
        data = CaseHearingSerializer(hearing).data
        return api_success("Hearing created", data=data, status_code=status.HTTP_201_CREATED)


class HearingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, hearing_id):
        hearing = get_hearing(request.user, hearing_id)
        data = CaseHearingSerializer(hearing).data
        return api_success("Hearing retrieved", data=data)

    def patch(self, request, hearing_id):
        hearing = get_hearing(request.user, hearing_id)
        serializer = CaseHearingSerializer(hearing, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)
        hearing = update_hearing(request.user, hearing_id, serializer.validated_data)
        data = CaseHearingSerializer(hearing).data
        return api_success("Hearing updated", data=data)

    def delete(self, request, hearing_id):
        delete_hearing(request.user, hearing_id)
        return api_success("Hearing deleted", data={"id": str(hearing_id)})
