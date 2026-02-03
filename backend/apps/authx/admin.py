from django.contrib import admin

from .models import Firm


@admin.register(Firm)
class FirmAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug', 'owner', 'created_at')
    search_fields = ('name', 'slug', 'owner__email')
    readonly_fields = ('created_at',)
