from decimal import Decimal

from apps.billing.models import CaseTypeFeePolicy


def get_default_fee_for_case_type(firm, case_type):
    if not firm or not case_type:
        return None
    policy = (
        CaseTypeFeePolicy.objects.filter(
            firm=firm,
            case_type=case_type,
            is_active=True,
            is_deleted=False,
        )
        .order_by("-updated_at")
        .first()
    )
    if not policy:
        return None
    return {
        "amount": policy.default_amount if policy.default_amount is not None else Decimal("0.00"),
        "currency": policy.currency or "AED",
        "policy_id": str(policy.id),
    }
