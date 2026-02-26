import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from apps.authx.models import Firm
from apps.cases.models import Case, ClientProfile
from apps.casetypes.models import CaseType


class InvoiceStatus(models.TextChoices):
    PENDING_REVIEW = "PENDING_REVIEW", "Pending review"
    PENDING = "PENDING", "Pending"
    DRAFT = "DRAFT", "Draft"
    SENT = "SENT", "Sent"
    PARTIAL = "PARTIAL", "Partial"
    PAID = "PAID", "Paid"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    STRIPE = "STRIPE", "Stripe"
    BANK = "BANK", "Bank"
    OTHER = "OTHER", "Other"


class PaymentStatus(models.TextChoices):
    SUCCEEDED = "SUCCEEDED", "Succeeded"
    FAILED = "FAILED", "Failed"
    PENDING = "PENDING", "Pending"
    REFUNDED = "REFUNDED", "Refunded"


class FirmInvoiceSequence(models.Model):
    firm = models.OneToOneField(Firm, on_delete=models.CASCADE, related_name="invoice_sequence")
    next_number = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.firm_id}: {self.next_number}"


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="invoices")
    client = models.ForeignKey(ClientProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    case = models.ForeignKey(Case, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    invoice_number = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.SENT)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="invoices_created")
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["firm", "invoice_number"]),
            models.Index(fields=["firm", "status", "issue_date"]),
        ]

    def __str__(self):
        return self.invoice_number


class InvoiceLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="line_items")
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1.00"))
    unit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["invoice", "created_at"]),
        ]

    def __str__(self):
        return f"{self.invoice_id} - {self.description}"


class CaseTypeFeePolicy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="case_type_fee_policies")
    case_type = models.ForeignKey(CaseType, on_delete=models.CASCADE, related_name="fee_policies")
    currency = models.CharField(max_length=10, default="AED")
    default_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "case_type"],
                condition=models.Q(is_deleted=False),
                name="uniq_case_type_fee_policy_per_firm_case_type",
            ),
        ]
        indexes = [
            models.Index(fields=["firm", "case_type"]),
            models.Index(fields=["firm", "is_active"]),
            models.Index(fields=["firm", "is_deleted"]),
        ]

    def __str__(self):
        return f"{self.firm_id} - {self.case_type_id}"


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(Firm, on_delete=models.CASCADE, related_name="payments")
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    client = models.ForeignKey(ClientProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    payment_method = models.CharField(max_length=12, choices=PaymentMethod.choices)
    payment_status = models.CharField(max_length=12, choices=PaymentStatus.choices, default=PaymentStatus.SUCCEEDED)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="AED")
    paid_at = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="payments_received")
    notes = models.TextField(null=True, blank=True)
    reference_number = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["firm", "invoice", "created_at"]),
            models.Index(fields=["firm", "client", "created_at"]),
        ]

    def __str__(self):
        return f"Payment {self.amount} {self.currency}"
