from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.authx.models import Firm, UserProfile
from apps.audit.models import AuditLog, EntityType, AuditAction
from apps.audit.services import log_audit_event


User = get_user_model()


def create_user(email, password="Pass@123", firm=None, role=None, is_superuser=False):
    user = User.objects.create_user(username=email, email=email, password=password, is_superuser=is_superuser, is_staff=is_superuser)
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = role
    profile.firm = firm
    profile.save(update_fields=["role", "firm"])
    return user


class AuditLogAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.firm1 = Firm.objects.create(name="Firm One", slug="firm-one", owner=create_user("owner1@example.com"))
        self.firm2 = Firm.objects.create(name="Firm Two", slug="firm-two", owner=create_user("owner2@example.com"))

        self.owner = create_user("admin@firm1.com", firm=self.firm1, role="FIRM_OWNER")
        self.staff = create_user("staff@firm1.com", firm=self.firm1, role="LAWYER")
        self.other_firm_admin = create_user("admin@firm2.com", firm=self.firm2, role="FIRM_OWNER")
        self.superadmin = create_user("super@example.com", is_superuser=True)

        # seed logs
        self.log1 = log_audit_event(
            firm=self.firm1,
            actor=self.owner,
            entity_type=EntityType.CASE,
            entity_id="case-1",
            action=AuditAction.CREATED,
            message="Case created",
            metadata={"title": "Case 1"},
        )
        self.log2 = log_audit_event(
            firm=self.firm1,
            actor=self.owner,
            entity_type=EntityType.TASK,
            entity_id="task-1",
            action=AuditAction.UPDATED,
            message="Task updated",
        )
        self.log3 = log_audit_event(
            firm=self.firm2,
            actor=self.other_firm_admin,
            entity_type=EntityType.CASE,
            entity_id="case-2",
            action=AuditAction.DELETED,
            message="Deleted elsewhere",
        )
        # older log for date range
        self.log_old = log_audit_event(
            firm=self.firm1,
            actor=self.owner,
            entity_type=EntityType.CASE,
            entity_id="case-old",
            action=AuditAction.UPDATED,
            message="Old update",
        )
        AuditLog.objects.filter(id=self.log_old.id).update(created_at=timezone.now() - timedelta(days=10))

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_firm_scoping(self):
        self.authenticate(self.owner)
        res = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])
        ids = [item["id"] for item in res.data["data"]]
        self.assertIn(str(self.log1.id), ids)
        self.assertNotIn(str(self.log3.id), ids)

    def test_permission_denied_for_staff(self):
        self.authenticate(self.staff)
        res = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(res.status_code, 403)
        self.assertFalse(res.data["success"])

    def test_filters_entity_type_action_search(self):
        self.authenticate(self.owner)
        res = self.client.get("/api/v1/audit-logs/", {"entity_type": EntityType.TASK})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["data"]), 1)
        res = self.client.get("/api/v1/audit-logs/", {"action": AuditAction.CREATED})
        self.assertEqual(len(res.data["data"]), 1)
        res = self.client.get("/api/v1/audit-logs/", {"search": "Task"})
        self.assertEqual(len(res.data["data"]), 1)

    def test_date_range_filter(self):
        self.authenticate(self.owner)
        today = timezone.now()
        res = self.client.get(
            "/api/v1/audit-logs/",
            {"date_from": (today - timedelta(days=2)).isoformat(), "date_to": (today + timedelta(days=1)).isoformat()},
        )
        self.assertEqual(res.status_code, 200)
        ids = [item["id"] for item in res.data["data"]]
        self.assertIn(str(self.log1.id), ids)
        self.assertNotIn(str(self.log_old.id), ids)

    def test_detail_scoped(self):
        self.authenticate(self.owner)
        res = self.client.get(f"/api/v1/audit-logs/{self.log3.id}/")
        self.assertEqual(res.status_code, 404)

    def test_case_audit_logs_endpoint(self):
        self.authenticate(self.owner)
        res = self.client.get(f"/api/v1/cases/case-1/audit-logs/")
        self.assertEqual(res.status_code, 200)
        ids = [item["id"] for item in res.data["data"]]
        self.assertIn(str(self.log1.id), ids)
        self.assertNotIn(str(self.log2.id), ids)

    def test_pagination_meta(self):
        self.authenticate(self.superadmin)
        # create extra logs for firm1
        for i in range(25):
            log_audit_event(
                firm=self.firm1,
                actor=self.owner,
                entity_type=EntityType.OTHER,
                entity_id=f"extra-{i}",
                action=AuditAction.CREATED,
            )
        res = self.client.get("/api/v1/audit-logs/", {"page_size": 20})
        self.assertEqual(res.status_code, 200)
        meta = res.data["meta"]
        self.assertEqual(meta["page_size"], 20)
        self.assertTrue(meta["has_next"])
        self.assertFalse(meta["has_prev"])

    def test_response_envelope(self):
        self.authenticate(self.owner)
        res = self.client.get("/api/v1/audit-logs/")
        self.assertIn("success", res.data)
        self.assertIn("message", res.data)
        self.assertIn("data", res.data)
        self.assertIn("errors", res.data)
        self.assertIn("meta", res.data)
