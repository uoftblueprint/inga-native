from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated

from projects.models import Project, Site
from projects.serializers import ProjectSerializer, SiteSerializer


class ProjectListView(ListAPIView):
    """GET /api/projects/ : the active programmes a worker can pick from."""
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return active projects to the field workers
        return Project.objects.filter(active=True).order_by("name")


class ProjectSiteListView(ListAPIView):  # this returns farms
    """GET /api/projects/<id>/sites/ : the farms in one active programme."""

    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs["project_id"]

        # IMPORTANT: select_related("region") fixes the N+1 query problem!
        return (
            Site.objects.filter(project_id=project_id)
            .select_related("region")
            .order_by("name")
        )

class SiteView(RetrieveAPIView):
    """GET /api/site/<site_id> : retrieves a site by id (url listed in config.py)"""
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"            # model field to filter on
    lookup_url_kwarg = "site_id"   # URL kwarg to read the value from

    def get_queryset(self):
        return Site.objects.filter(active=True)
