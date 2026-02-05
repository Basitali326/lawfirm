from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.authx.models import Firm
from apps.cases.models import Case, CaseStatus, CasePriority


User = get_user_model()


class AddCaseAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create firm owner user
        self.owner = User.objects.create_user(
            username="owner_case",
            email="owner_case@example.com",
            password="pass1234",
            first_name="Owner",
            last_name="Case",
        )
        self.owner.role = "FIRM_OWNER"
        self.firm = Firm.objects.create(name="Test Firm", slug="test-firm", owner=self.owner)
        # owned_firm relation exists via related_name on Firm.owner
        self.client.force_authenticate(self.owner)

    def test_create_case_success(self):
        payload = {
            "title": "Acme vs Doe",
            "case_type": "Civil",
            "case_number": "CIV-1001",
            "status": CaseStatus.OPEN,
            "priority": CasePriority.HIGH,
            "description": "Test description",
            "court_name": "Central Court",
            "judge_name": "Judge Judy",
            "open_date": date.today().isoformat(),
        }

        response = self.client.post("/api/v1/cases/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Case created successfully")
        data = response.data["data"]
        self.assertEqual(data["title"], payload["title"])
        self.assertEqual(data["case_number"], payload["case_number"])
        self.assertEqual(Case.objects.count(), 1)

    def test_forbidden_for_non_owner_role(self):
        other_user = User.objects.create_user(
            username="clientuser",
            email="client@example.com",
            password="pass1234",
        )
        other_user.role = "CLIENT"
        self.client.force_authenticate(other_user)

        response = self.client.post(
            "/api/v1/cases/",
            {"title": "Should Fail"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Forbidden")
