import uuid
from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.authx.models import Firm
from apps.cases.models import Case, Client, CaseStatus


User = get_user_model()


class CaseCreateAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="firmadmin",
            email="admin@example.com",
            password="pass1234",
            first_name="Firm",
            last_name="Admin",
        )
        self.firm = Firm.objects.create(name="Acme Law", slug="acme-law", owner=self.user)
        # Attach firm and role dynamically to mimic assumed schema
        self.user.firm = self.firm
        self.user.firm_id = self.firm.id
        self.user.role = "FIRM_ADMIN"

    def _auth(self, user=None):
        self.client.force_authenticate(user or self.user)

    def _make_payload(self, **overrides):
        payload = {
            "title": "Acme vs John",
            "case_type": "Civil",
            "case_number": "CIV-2026-001",
            "status": "OPEN",
            "priority": "HIGH",
            "description": "Initial filing",
            "court_name": "Dubai Courts",
            "judge_name": "Judge X",
            "open_date": str(date.today()),
        }
        payload.update(overrides)
        return payload

    def test_create_case_success_returns_wrapped_data(self):
        self._auth()
        payload = self._make_payload()

        response = self.client.post("/api/cases/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["success"], True)
        self.assertEqual(response.data["message"], "Case created successfully")
        self.assertIsNotNone(response.data["data"])
        self.assertIsNone(response.data["errors"])
        case = Case.objects.get(id=response.data["data"]["id"])
        self.assertEqual(case.firm, self.firm)
        self.assertEqual(case.created_by, self.user)

    def test_create_case_validation_error_wrapped(self):
        self._auth()
        payload = self._make_payload(title="ab")

        response = self.client.post("/api/cases/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Validation error")
        self.assertIsNone(response.data["data"])
        self.assertIn("title", response.data["errors"])

    def test_create_case_forbidden_role_wrapped(self):
        user = User.objects.create_user(username="intern", email="intern@example.com", password="pass1234")
        user.firm = self.firm
        user.firm_id = self.firm.id
        user.role = "INTERN"
        self._auth(user)

        response = self.client.post("/api/cases/", self._make_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "You do not have permission to create cases.")
        self.assertIsNone(response.data["data"])
        self.assertIsNone(response.data["errors"])

    def test_owner_role_can_create(self):
        owner_user = User.objects.create_user(username="owner1", email="owner1@example.com", password="pass1234")
        owner_user.firm = self.firm
        owner_user.firm_id = self.firm.id
        owner_user.role = "Owner"  # mixed case variant from auth responses
        self._auth(owner_user)

        response = self.client.post("/api/cases/", self._make_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertIsNotNone(response.data["data"])

    def test_case_number_unique_per_firm_wrapped(self):
        self._auth()
        Case.objects.create(
            id=uuid.uuid4(),
            firm=self.firm,
            created_by=self.user,
            title="Existing",
            case_number="CIV-2026-001",
            status=CaseStatus.OPEN,
            priority="MEDIUM",
            open_date=date.today(),
        )
        payload = self._make_payload(case_number="CIV-2026-001")

        response = self.client.post("/api/cases/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Validation error")
        self.assertIn("case_number", response.data["errors"])

    def test_assigned_lead_other_firm_rejected_wrapped(self):
        self._auth()
        other_user = User.objects.create_user(username="other", email="other@example.com", password="pass1234")
        other_firm = Firm.objects.create(name="Beta Law", slug="beta-law", owner=other_user)
        other_user.firm = other_firm
        other_user.firm_id = other_firm.id

        payload = self._make_payload(assigned_lead=str(other_user.id))
        response = self.client.post("/api/cases/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("assigned_lead", response.data["errors"])

    def test_client_other_firm_rejected_wrapped(self):
        self._auth()
        other_user = User.objects.create_user(username="other2", email="other2@example.com", password="pass1234")
        other_firm = Firm.objects.create(name="Gamma Law", slug="gamma-law", owner=other_user)
        client_other_firm = Client.objects.create(firm=other_firm, name="Foreign Client")

        payload = self._make_payload(client=str(client_other_firm.id))
        response = self.client.post("/api/cases/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("client", response.data["errors"])
