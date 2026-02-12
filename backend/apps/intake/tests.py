from unittest import mock
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.authx.models import Firm, UserProfile
from apps.intake.models import IntakeRequest, IntakeStatus


User = get_user_model()


def create_user(email, role, firm):
    user = User.objects.create_user(username=email, email=email, password="Pass@123")
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": role, "firm": firm})
    profile.role = role
    profile.firm = firm
    profile.save(update_fields=["role", "firm"])
    return user


class PublicIntakeTests(APITestCase):
    def setUp(self):
        self.firm = Firm.objects.create(name="Firm A", slug="firma", owner=create_user("owner@a.com", "FIRM_OWNER", None))

    @mock.patch("apps.intake.services.requests.post")
    def test_public_intake_recaptcha_pass(self, mpost):
        mpost.return_value.status_code = 200
        mpost.return_value.json.return_value = {"success": True, "score": 0.9, "action": "intake_submit"}
        url = f"/public/{self.firm.slug}/intake-requests/"
        payload = {
            "full_name": "John Doe",
            "phone": "+1 555 111 2222",
            "message": "Need help",
            "recaptcha_token": "token",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data["success"])
        self.assertEqual(IntakeRequest.objects.count(), 1)

    @mock.patch("apps.intake.services.requests.post")
    def test_public_intake_recaptcha_fail(self, mpost):
        mpost.return_value.status_code = 200
        mpost.return_value.json.return_value = {"success": False}
        url = f"/public/{self.firm.slug}/intake-requests/"
        payload = {
            "full_name": "John Doe",
            "phone": "+1 555 111 2222",
            "message": "Need help",
            "recaptcha_token": "bad",
        }
        resp = self.client.post(url, payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class DashboardIntakeTests(APITestCase):
    def setUp(self):
        self.firm = Firm.objects.create(name="Firm B", slug="firmb", owner=None)
        self.admin = create_user("admin@b.com", "FIRM_OWNER", self.firm)
        self.other_firm = Firm.objects.create(name="Firm C", slug="firmc", owner=None)
        self.admin_other = create_user("admin@c.com", "FIRM_OWNER", self.other_firm)
        self.intake = IntakeRequest.objects.create(
            firm=self.firm,
            full_name="Client X",
            phone="+15551234567",
            message="Help",
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_list_scoped(self):
        self.authenticate(self.admin)
        resp = self.client.get("/api/v1/intake-requests/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["data"]), 1)

        self.authenticate(self.admin_other)
        resp = self.client.get("/api/v1/intake-requests/")
        self.assertEqual(len(resp.data["data"]), 0)

    def test_update_status_transition(self):
        self.authenticate(self.admin)
        url = f"/api/v1/intake-requests/{self.intake.id}/"
        resp = self.client.patch(url, {"status": IntakeStatus.CONTACTED}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, IntakeStatus.CONTACTED)

        resp = self.client.patch(url, {"status": IntakeStatus.NEW}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
