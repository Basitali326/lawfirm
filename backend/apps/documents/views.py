from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.billing.models import Invoice, InvoiceStatus
from apps.cases.models import Case, CaseStatus
from apps.cases.utils import get_user_firm
from apps.documents.models import CaseDocument
from apps.documents.pagination import DocumentsPagination
from apps.documents.serializers import CaseDocumentSerializer, UploadDocumentSerializer
from apps.documents.services.document_service import create_case_document, soft_delete_document
from apps.rbac.services import user_has_perm
from apps.tasks.models import CaseTask
from core.responses import api_error, api_success


class DocumentPermissionMixin:
    permission_classes = [IsAuthenticated]

    def _user_roles(self, user):
        profile = getattr(user, "profile", None)
        base = {
            (getattr(user, "role", "") or "").upper(),
            (getattr(profile, "role", "") or "").upper(),
        }
        try:
            base.update(
                (name or "").upper()
                for name in user.user_roles.select_related("role").values_list("role__name", flat=True)
            )
        except Exception:
            pass
        return {r for r in base if r}

    def _is_case_member(self, user, case):
        if case.assigned_lead_id == user.id:
            return True
        if case.client_id and getattr(case.client, "user_id", None) == user.id:
            return True
        return case.tasks.filter(assigned_to_id=user.id, is_deleted=False).exists()

    def _can_view_case(self, user, case):
        roles = self._user_roles(user)
        if getattr(user, "is_superuser", False) or roles.intersection({"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER"}):
            return True
        if user_has_perm(user, "documents.view") or user_has_perm(user, "cases.view"):
            return True
        return self._is_case_member(user, case)

    def _can_upload(self, user, case):
        roles = self._user_roles(user)
        if getattr(user, "is_superuser", False) or roles.intersection({"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER"}):
            return True
        if user_has_perm(user, "documents.add") or user_has_perm(user, "documents.upload"):
            return True
        return self._is_case_member(user, case)

    def _can_delete(self, user, case):
        roles = self._user_roles(user)
        if getattr(user, "is_superuser", False) or roles.intersection({"SUPER_ADMIN", "FIRM_OWNER", "FIRM_ADMIN", "OWNER"}):
            return True
        return user_has_perm(user, "documents.delete")

    def _firm(self, user):
        return get_user_firm(user)


class OpenPaidCasesListView(DocumentPermissionMixin, APIView):
    def get(self, request):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)

        qs = (
            Case.objects.filter(
                firm=firm,
                is_deleted=False,
                status=CaseStatus.OPEN,
                invoices__is_deleted=False,
                invoices__status__in=[InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
            )
            .select_related("case_type")
            .distinct()
            .order_by("-created_at")
        )

        data = [
            {
                "id": str(c.id),
                "case_number": c.case_number,
                "title": c.title,
                "status": c.status,
                "case_type_detail": {
                    "id": str(c.case_type_id) if c.case_type_id else None,
                    "name": getattr(c.case_type, "name", None),
                    "code": getattr(c.case_type, "code", None),
                },
            }
            for c in qs
        ]
        return api_success("OK", data=data)


class CaseDocumentUploadView(DocumentPermissionMixin, APIView):
    def post(self, request, case_id):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)
        case = get_object_or_404(Case.objects.filter(firm=firm, is_deleted=False), id=case_id)
        if not self._can_upload(request.user, case):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)

        serializer = UploadDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            doc = create_case_document(
                request_user=request.user,
                firm=firm,
                case=case,
                uploaded_file=serializer.validated_data["file"],
                title=serializer.validated_data.get("title"),
                task=None,
            )
        except Exception as exc:
            if hasattr(exc, "detail"):
                return api_error("Validation error", errors=exc.detail, status_code=status.HTTP_400_BAD_REQUEST)
            return api_error(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        return api_success("Document uploaded", data=CaseDocumentSerializer(doc, context={"request": request}).data)


class TaskAttachmentUploadView(DocumentPermissionMixin, APIView):
    def post(self, request, task_id):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)
        task = get_object_or_404(
            CaseTask.objects.select_related("case", "case__client").filter(firm=firm, is_deleted=False),
            id=task_id,
        )
        if not self._can_upload(request.user, task.case):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)

        serializer = UploadDocumentSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error("Validation error", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            doc = create_case_document(
                request_user=request.user,
                firm=firm,
                case=task.case,
                uploaded_file=serializer.validated_data["file"],
                title=serializer.validated_data.get("title"),
                task=task,
            )
        except Exception as exc:
            if hasattr(exc, "detail"):
                return api_error("Validation error", errors=exc.detail, status_code=status.HTTP_400_BAD_REQUEST)
            return api_error(str(exc), status_code=status.HTTP_400_BAD_REQUEST)
        return api_success("Attachment uploaded", data=CaseDocumentSerializer(doc, context={"request": request}).data)


class CaseDocumentListView(DocumentPermissionMixin, APIView):
    pagination_class = DocumentsPagination

    def get(self, request, case_id):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)
        case = get_object_or_404(Case.objects.filter(firm=firm, is_deleted=False), id=case_id)
        if not self._can_view_case(request.user, case):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)

        qs = CaseDocument.objects.filter(firm=firm, case=case, is_active=True).select_related("uploaded_by")
        source = (request.query_params.get("source") or "all").lower()
        if source == "task":
            qs = qs.filter(task_id__isnull=False)
        elif source == "case":
            qs = qs.filter(task_id__isnull=True)
        qs = qs.order_by("-created_at")

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = CaseDocumentSerializer(page, many=True, context={"request": request})
        meta = {
            "page": paginator.page.number,
            "page_size": paginator.get_page_size(request),
            "total": paginator.page.paginator.count,
            "total_pages": paginator.page.paginator.num_pages,
            "has_next": paginator.page.has_next(),
            "has_prev": paginator.page.has_previous(),
        }
        return api_success("OK", data=serializer.data, meta=meta)


class TaskAttachmentListView(DocumentPermissionMixin, APIView):
    def get(self, request, task_id):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)
        task = get_object_or_404(CaseTask.objects.select_related("case").filter(firm=firm, is_deleted=False), id=task_id)
        if not self._can_view_case(request.user, task.case):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)

        docs = (
            CaseDocument.objects.filter(firm=firm, task=task, is_active=True)
            .select_related("uploaded_by")
            .order_by("-created_at")
        )
        serializer = CaseDocumentSerializer(docs, many=True, context={"request": request})
        return api_success("OK", data=serializer.data)


class DocumentDownloadView(DocumentPermissionMixin, APIView):
    def get(self, request, doc_id):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)
        doc = get_object_or_404(
            CaseDocument.objects.select_related("case", "uploaded_by").filter(firm=firm, is_active=True),
            id=doc_id,
        )
        if not self._can_view_case(request.user, doc.case):
            return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)
        response = FileResponse(doc.file.open("rb"), as_attachment=True, filename=doc.original_name)
        response["Content-Type"] = doc.mime_type or "application/octet-stream"
        return response


class DocumentDeleteView(DocumentPermissionMixin, APIView):
    def delete(self, request, doc_id):
        firm = self._firm(request.user)
        if not firm:
            return api_error("User firm not set", status_code=status.HTTP_400_BAD_REQUEST)
        doc = get_object_or_404(CaseDocument.objects.select_related("case").filter(firm=firm, is_active=True), id=doc_id)
        if not self._can_delete(request.user, doc.case):
            return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
        soft_delete_document(doc)
        return api_success("Document deleted", data={"id": str(doc.id)})

