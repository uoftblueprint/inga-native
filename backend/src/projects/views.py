from django.shortcuts import get_object_or_404
from django.views.generic import ListView
from rest_framework.generics import ListAPIView

from .models import ProjectSite
from .serializers import ProjectSerializer, SiteSerializer


class ProjectListView(ListAPIView):
    """GET /api/projects/ : the active programmes a worker can pick from."""

    queryset = Project.objects.filter(active=True).order_by("name")
    serializer_class = ProjectSerializer


class ProjectSiteListView(ListAPIView):
    """GET /api/projects/<id>/sites/ : the farms in one active programme."""

    serializer_class = SiteSerializer

    def get_queryset(self):  # diff request each time
        project = get_object_or_404(Project, pk=self.kwargs["project_id"], active=True)

        return (
            Site.objects.filter(project=project).select_related("region").order_by("name")
        )
