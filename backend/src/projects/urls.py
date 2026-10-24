# Mounted at /api/projects/ by config/urls.py.
from django.urls import path

from projects.views import ProjectListView, ProjectSiteListView

# Mounted at /api/projects/ by config/urls.py.
urlpatterns = [path("", ProjectListView.as_view(), name="project-list"),
               path("<int:project_id>/sites/", ProjectSiteListView.as_view(), name="project-site-list"), # we need specific id values back so angled brackets
               ]
