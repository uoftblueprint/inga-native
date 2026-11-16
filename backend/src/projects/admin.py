from django.contrib import admin

from .models import Project, Region, Site, SupplyItem, Village

admin.site.register(Region)
admin.site.register(Project)
admin.site.register(Site)


@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "active")
    list_filter = ("region", "active")
    search_fields = ("name",)


@admin.register(SupplyItem)
class SupplyItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "unit", "quantity_kind", "active")
    list_filter = ("category", "unit", "active")
    search_fields = ("name",)

    def get_readonly_fields(self, request, obj=None):
        # Once an item exists, its unit is fixed: visits may already use it.
        # To change the unit, set this item inactive and add a new one.
        if obj is not None:
            return ("unit",)
        return ()
