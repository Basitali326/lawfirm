from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from apps.authx.models import Firm
from apps.ecommerce.models import Seller
from apps.website.models import Article, ArticleCategory, Certification, Ebook, PublishStatus


EBOOKS = [
    ("UAE Business Law Guide", "uae-business-law-guide", "149.00", "Company formation, contracts, governance, and commercial compliance."),
    ("Property Rights in Dubai", "property-rights-in-dubai", "99.00", "Ownership, leasing, investor protections, and property dispute fundamentals."),
    ("Family Law Handbook", "family-law-handbook", "119.00", "A practical introduction to UAE family and personal status procedures."),
]

ARTICLES = [
    ("Corporate Law", "Starting a Business in the UAE: Legal Essentials", "starting-a-business-in-the-uae"),
    ("Employment Law", "Understanding UAE Employment Contracts", "understanding-uae-employment-contracts"),
    ("Real Estate", "A Practical Guide to Property Disputes", "practical-guide-property-disputes"),
]


def build_pdf(title, description):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    pdf.setTitle(title)
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(60, height - 90, title)
    pdf.setFont("Helvetica", 12)
    text = pdf.beginText(60, height - 135)
    text.setLeading(19)
    for paragraph in [
        description,
        "",
        "This sample publication is provided by Dr Alaa Nasir.",
        "Replace this seeded file with the final reviewed legal publication before production launch.",
    ]:
        text.textLine(paragraph)
    pdf.drawText(text)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


class Command(BaseCommand):
    help = "Seed published website content for the first active firm."

    def add_arguments(self, parser):
        parser.add_argument("--firm-slug", default="")

    def handle(self, *args, **options):
        firms = Firm.objects.filter(status="ACTIVE")
        firm = firms.filter(slug=options["firm_slug"]).first() if options["firm_slug"] else firms.order_by("created_at").first()
        if not firm:
            raise CommandError("No active firm found.")

        seller, _ = Seller.objects.get_or_create(
            firm=firm,
            email="contact@almizanlegal.ae",
            defaults={
                "name": f"{firm.name} Publications",
                "company_name": firm.name,
                "commission_percent": 100,
                "is_active": True,
            },
        )

        for title, slug, price, description in EBOOKS:
            ebook, created = Ebook.objects.get_or_create(
                firm=firm,
                slug=slug,
                defaults={
                    "seller": seller,
                    "title": title,
                    "subtitle": "Dr Alaa Nasir Legal Practical Series",
                    "author": firm.name,
                    "short_description": description,
                    "description": f"{description} Written as a clear, practical reference for UAE residents and businesses.",
                    "price_aed": price,
                    "pages": 1,
                    "status": PublishStatus.PUBLISHED,
                    "is_featured": True,
                },
            )
            if created or not ebook.ebook_file:
                ebook.ebook_file.save(f"{slug}.pdf", ContentFile(build_pdf(title, description)), save=True)

        for order, (title, description) in enumerate([
            ("Licensed Legal Consultancy", "Professional legal consultancy credential and practice recognition."),
            ("International Arbitration Practice", "Accreditation reflecting experience in arbitration and dispute resolution."),
            ("Corporate Compliance Advisory", "Professional recognition for corporate compliance and governance advisory."),
        ]):
            Certification.objects.get_or_create(
                firm=firm,
                title=title,
                defaults={
                    "description": description,
                    "sort_order": order,
                    "is_active": True,
                },
            )

        for category_name, title, slug in ARTICLES:
            category, _ = ArticleCategory.objects.get_or_create(
                firm=firm,
                slug=category_name.lower().replace(" ", "-"),
                defaults={"name": category_name, "is_active": True},
            )
            Article.objects.get_or_create(
                firm=firm,
                slug=slug,
                defaults={
                    "category": category,
                    "title": title,
                    "excerpt": f"Practical guidance from our {category_name.lower()} team for clients in the UAE.",
                    "content": (
                        f"{title}\n\n"
                        "Every legal matter depends on its specific facts, documents, and timing. "
                        "This overview explains the core issues clients should consider, the records "
                        "they should preserve, and when tailored legal advice is appropriate.\n\n"
                        "Contact our team for advice specific to your circumstances."
                    ),
                    "author_name": firm.name,
                    "status": PublishStatus.PUBLISHED,
                    "published_at": timezone.now(),
                    "is_featured": True,
                },
            )

        self.stdout.write(self.style.SUCCESS(f"Website content seeded for {firm.name}."))
