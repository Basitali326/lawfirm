import datetime
from django.db import transaction
from django.utils import timezone

from apps.task_templates.models import CaseTaskTemplate, CaseTaskTemplateItem
from apps.tasks.models import CaseTask, TaskStatus


ASSIGN_MAP = {
    "CASE_LEAD": "lead",
    "CASE_LAWYER": "lawyer",
    "CASE_PARALEGAL": "paralegal",
    "CASE_ACCOUNTANT": "accountant",
    "UNASSIGNED": None,
}


def _resolve_assignee(case, assign_to):
    if assign_to == "CASE_LEAD":
        return getattr(case, "assigned_lead", None)
    # Case member roles not implemented; return None for others for now
    return None


def generate_tasks_for_case(case, triggered_by_user=None, force=False):
    """
    Creates CaseTask entries from the default active template for the case's case_type.
    Returns dict: {created_count, template_id, tasks_generated_at, reason}
    """
    template = (
        CaseTaskTemplate.objects.filter(
            firm=case.firm,
            case_type=case.case_type,
            is_default=True,
            is_active=True,
            is_deleted=False,
        )
        .order_by("-updated_at")
        .first()
    )
    if not template:
        return {"created_count": 0, "reason": "no_template"}

    if case.tasks_generated_at and not force:
        return {"created_count": 0, "reason": "already_generated", "template_id": str(template.id)}

    template_items = template.items.filter(is_deleted=False, is_active=True).order_by("sort_order", "created_at")
    if not template_items.exists():
        return {"created_count": 0, "reason": "no_items", "template_id": str(template.id)}

    created = []
    with transaction.atomic():
        # When forcing regeneration, drop previous tasks generated from this template for this case
        if force:
            CaseTask.objects.filter(case=case, generated_from_template=template).delete()

        base_date = case.opened_at or datetime.date.today()
        for item in template_items:
            due_date = None
            if item.due_in_days is not None:
                due_date = base_date + datetime.timedelta(days=item.due_in_days)
            assignee = _resolve_assignee(case, item.assign_to)
            task = CaseTask.objects.create(
                firm=case.firm,
                case=case,
                title=item.title,
                description=item.description,
                status=item.default_status or TaskStatus.TODO,
                priority=item.priority,
                assigned_to=assignee,
                due_date=due_date,
                created_by=triggered_by_user,
                generated_from_template=template,
                generated_from_template_item=item,
            )
            created.append(task)
        now = timezone.now()
        case.tasks_generated_at = now
        if not case.opened_at:
            case.opened_at = now
        case.save(update_fields=["tasks_generated_at", "opened_at", "updated_at"])
    return {
        "created_count": len(created),
        "template_id": str(template.id),
        "tasks_generated_at": case.tasks_generated_at,
        "reason": "created",
    }
