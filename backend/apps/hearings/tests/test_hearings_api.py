from datetime import datetime, timedelta, timezone

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from apps.authx.models import Firm
from apps.cases.models import Case
from apps.hearings.models import CaseHearing, HearingStatus, HearingType


User = get_user_model()


class HearingsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            username="owner_hearing",
            email="owner_hearing@example.com",
            password="pass1234",
            first_name="Owner",
            last_name="Hearing",
        )
        self.owner.role = "FIRM_OWNER"
        self.firm = Firm.objects.create(name="Hearing Firm", slug="hearing-firm", owner=self.owner)
        self.case = Case.objects.create(
            firm=self.firm,
            title="Hearing Case",
            status="OPEN",
            priority="MEDIUM",
            created_by=self.owner,
        )
        self.client.force_authenticate(self.owner)
        self.now = datetime.now(timezone.utc)

    def test_create_hearing_success(self):
        payload = {
            "title": "Initial Hearing",
            "hearing_type": HearingType.MOTION,
            "start_at": (self.now + timedelta(days=1)).isoformat(),
            "end_at": (self.now + timedelta(days=1, hours=1)).isoformat(),
            "status": HearingStatus.SCHEDULED,
        }
        resp = self.client.post(f"/api/v1/cases/{self.case.id}/hearings/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(resp.data["success"])
        self.assertEqual(CaseHearing.objects.count(), 1)
        self.assertEqual(resp.data["data"]["title"], payload["title"])

    def test_create_requires_manage_permission(self):
        staff = User.objects.create_user(
            username="staff_user",
            email="staff@example.com",
            password="pass1234",
        )
        staff.role = "LAWYER"
        self.client.force_authenticate(staff)
        payload = {
            "title": "Should Fail",
            "start_at": (self.now + timedelta(days=1)).isoformat(),
        }
        resp = self.client.post(f"/api/v1/cases/{self.case.id}/hearings/", payload, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_scoped_to_firm(self):
        other_owner = User.objects.create_user(
            username="other_owner",
            email="other_owner@example.com",
            password="pass1234",
        )
        other_owner.role = "FIRM_OWNER"
        other_firm = Firm.objects.create(name="Other Firm", slug="other-firm", owner=other_owner)
        other_case = Case.objects.create(
            firm=other_firm, title="Other Case", status="OPEN", priority="LOW", created_by=other_owner
        )
        CaseHearing.objects.create(
            firm=self.firm,
            case=self.case,
            title="My Hearing",
            hearing_type=HearingType.MENTION,
            start_at=self.now + timedelta(days=2),
            status=HearingStatus.SCHEDULED,
        )
        CaseHearing.objects.create(
            firm=other_firm,
            case=other_case,
            title="Other Hearing",
            hearing_type=HearingType.MOTION,
            start_at=self.now + timedelta(days=3),
            status=HearingStatus.SCHEDULED,
        )

        resp = self.client.get(f"/api/v1/cases/{self.case.id}/hearings/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [h["title"] for h in resp.data["data"]]
        self.assertIn("My Hearing", titles)
        self.assertNotIn("Other Hearing", titles)

    def test_update_and_delete(self):
        hearing = CaseHearing.objects.create(
            firm=self.firm,
            case=self.case,
            title="Update Me",
            hearing_type=HearingType.TRIAL,
            start_at=self.now + timedelta(days=4),
            status=HearingStatus.SCHEDULED,
        )
        resp = self.client.patch(
            f"/api/v1/hearings/{hearing.id}/",
            {"status": HearingStatus.ADJOURNED},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        hearing.refresh_from_db()
        self.assertEqual(hearing.status, HearingStatus.ADJOURNED)

        resp = self.client.delete(f"/api/v1/hearings/{hearing.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        hearing.refresh_from_db()
        self.assertTrue(hearing.is_deleted)
