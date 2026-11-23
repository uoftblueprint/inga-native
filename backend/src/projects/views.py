from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from projects.models import Project, Site, SupplyItem
from projects.serializers import ProjectSerializer, SiteSerializer, SupplyItemSerializer


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

        # IMPORTANT: select_related("region", "village") fixes the N+1 query problem!
        return (
            Site.objects.filter(project_id=project_id)
            .select_related("region", "village")
            .order_by("name")
        )


class SupplyItemListView(ListAPIView):
    """GET /api/supply-items/ : active supplies for the delivery dropdowns.

    Inactive items are left out so they can't be picked for new visits,
    but they stay in the database so past deliveries still point at them.
    """

    serializer_class = SupplyItemSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return SupplyItem.objects.filter(active=True).order_by("category", "name")
