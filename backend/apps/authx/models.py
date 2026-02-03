from django.conf import settings
from django.db import models
from django.utils.text import slugify


def generate_unique_slug(model, base_text: str, slug_field: str = 'slug') -> str:
    """Generate a unique slug for the given model based on base_text."""
    base_slug = slugify(base_text) or 'firm'
    slug = base_slug
    index = 1
    while model.objects.filter(**{slug_field: slug}).exists():
        slug = f"{base_slug}-{index}"
        index += 1
    return slug


class Firm(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_firm')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = generate_unique_slug(Firm, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
