from django.contrib import admin

from .models import Project, Region, Site

admin.site.register(Region)
admin.site.register(Project)
admin.site.register(Site)
