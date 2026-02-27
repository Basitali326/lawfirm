from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authx.models import Firm, UserProfile
from apps.billing.models import Invoice, InvoiceStatus
from apps.cases.models import Case, CasePriority, CaseStatus, ClientProfile
from apps.casetypes.models import CaseType
from apps.documents.models import CaseDocument
from apps.tasks.models import CaseTask


User = get_user_model()


class DocumentsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username="owner", email="owner@test.com", password="pass1234")
        self.firm = Firm.objects.create(name="Docs Firm", slug="docs-firm", owner=self.owner)
        profile, _ = UserProfile.objects.get_or_create(user=self.owner)
        profile.role = "FIRM_OWNER"
        profile.firm = self.firm
        profile.save(update_fields=["role", "firm"])

        self.client_user = User.objects.create_user(username="client", email="client@test.com", password="pass1234")
        client_profile, _ = UserProfile.objects.get_or_create(user=self.client_user)
        client_profile.role = "CLIENT"
        client_profile.firm = self.firm
        client_profile.save(update_fields=["role", "firm"])

        self.client_contact = ClientProfile.objects.create(firm=self.firm, user=self.client_user, name="Client A")
        self.case_type = CaseType.objects.create(firm=self.firm, name="Civil", code="CIV", created_by=self.owner)
        self.case = Case.objects.create(
            firm=self.firm,
            title="Doc Case",
            case_type=self.case_type,
            case_number="CIA-2026-990",
            status=CaseStatus.OPEN,
            priority=CasePriority.MEDIUM,
            client=self.client_contact,
            assigned_lead=self.owner,
            created_by=self.owner,
        )
        self.task = CaseTask.objects.create(
            firm=self.firm,
            case=self.case,
            title="Upload docs",
            status="TODO",
            priority="MEDIUM",
            created_by=self.owner,
        )
        self.invoice = Invoice.objects.create(
            firm=self.firm,
            client=self.client_contact,
            case=self.case,
            invoice_number="INV-2026-990001",
            status=InvoiceStatus.PAID,
            total_amount="100.00",
            paid_amount="100.00",
            balance_amount="0.00",
            created_by=self.owner,
        )
        self.client.force_authenticate(self.owner)

    def _pdf_file(self, name="doc.pdf", size=16):
        return SimpleUploadedFile(name, b"%PDF-1.4\n" + (b"a" * size), content_type="application/pdf")

    def test_upload_case_document_ok(self):
        resp = self.client.post(
            f"/api/v1/documents/cases/{self.case.id}/upload/",
            {"file": self._pdf_file(), "title": "Passport"},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(CaseDocument.objects.filter(case=self.case, is_active=True).count(), 1)

    def test_reject_large_file(self):
        big = self._pdf_file(size=6 * 1024 * 1024)
        resp = self.client.post(
            f"/api/v1/documents/cases/{self.case.id}/upload/",
            {"file": big},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_reject_invalid_extension(self):
        bad = SimpleUploadedFile("evil.exe", b"abc", content_type="application/octet-stream")
        resp = self.client.post(
            f"/api/v1/documents/cases/{self.case.id}/upload/",
            {"file": bad},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_reject_unpaid_case(self):
        self.invoice.status = InvoiceStatus.PENDING
        self.invoice.save(update_fields=["status"])
        resp = self.client.post(
            f"/api/v1/documents/cases/{self.case.id}/upload/",
            {"file": self._pdf_file()},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_task_attachments_list_only_task_docs(self):
        first = self.client.post(
            f"/api/v1/tasks/{self.task.id}/attachments/upload/",
            {"file": self._pdf_file("a.pdf")},
            format="multipart",
        )
        self.assertEqual(first.status_code, 200, first.data)
        CaseDocument.objects.create(
            firm=self.firm,
            case=self.case,
            task=None,
            uploaded_by=self.owner,
            file=self._pdf_file("b.pdf"),
            original_name="b.pdf",
            mime_type="application/pdf",
            extension="pdf",
            size_bytes=1024,
            is_active=True,
        )
        resp = self.client.get(f"/api/v1/tasks/{self.task.id}/attachments/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["data"]), 1)

    def test_cross_firm_access_blocked(self):
        other = User.objects.create_user(username="other", email="other@test.com", password="pass1234")
        other_firm = Firm.objects.create(name="Other Firm", slug="other-firm", owner=other)
        other_profile, _ = UserProfile.objects.get_or_create(user=other)
        other_profile.role = "FIRM_OWNER"
        other_profile.firm = other_firm
        other_profile.save(update_fields=["role", "firm"])
        self.client.force_authenticate(other)
        resp = self.client.get(f"/api/v1/documents/cases/{self.case.id}/")
        self.assertEqual(resp.status_code, 404)
