from django.shortcuts import get_object_or_404
from django.views.generic import ListView
from rest_framework.generics import ListAPIView

from .models import ProjectSite
from .serializers import ProjectSerializer, SiteSerializer


class ProjectListView(ListAPIView):
    """GET /api/projects/ : the active programmes a worker can pick from."""
    serializer_class = ProjectSerializer
    queryset = Project.objects.filter(active=True).order_by("name")


class ProjectSiteListView(ListAPIView):  # this returns farms
    """GET /api/projects/<id>/sites/ : the farms in one active programme."""

    serializer_class = SiteSerializer

    def get_queryset(self):  # diff request each time
        project = get_object_or_404(Project, pk=self.kwargs["project_id"],
                                    active=True)  # ex. self.kwargs == {"project_id": 3}

        return (
            Site.objects.filter(project=project).select_related("region").order_by("name")  # not too sure
            # Site.objects.filter(project=project, workers=self.request.user) # if farmers are assignend to specific ones
        )
