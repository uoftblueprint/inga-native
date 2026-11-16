from rest_framework import serializers

from .models import Project, Region, Site, SupplyItem, Village

"""
Serializers for the projects app

Before a worker can record anything, the app has to show them which programmes exist and which farms are in each one, 
so they can pick where they are.

RegionSerializer
ProjectSerializer
VillageSerializer
SiteSerializer
SupplyItemSerializer
"""


class RegionSerializer(serializers.ModelSerializer):
    """A region a farm sits in
    Note: latitude and longitude are DecimalFields and can be Null
    """

    class Meta:
        model = Region
        fields = ["id", "name", "latitude", "longitude"]


class VillageSerializer(serializers.ModelSerializer):
    """A village a farm may sit in. `region` is the region's id."""

    class Meta:
        model = Village
        fields = ["id", "name", "region"]


class ProjectSerializer(serializers.ModelSerializer):
    """A programme the worker can pick. Used by GET /api/projects/.

     - `id`: permanent identifier. The app needs it to build the next URL
      (/api/projects/<id>/sites/) and to attach submissions to a programme.
      We don't use `name` for this because names can be edited.
    - `log_schema`: describes the form fields a worker fills in for this
      programme, e.g. {"trees_planted": "numerical", "notes": "text"}.
      The recording screen builds its inputs from this, so the form can
      change per programme without any app code changing.
    """

    class Meta:
        model = Project
        fields = ["id", "name", "description", "active", "log_schema"]


class SiteSerializer(serializers.ModelSerializer):
    """A farm inside one programme. Used by GET /api/projects/<id>/sites/.

     - `id`: what submissions and photos attach to
    """
    region = RegionSerializer(read_only=True)
    village = VillageSerializer(read_only=True)

    class Meta:
        model = Site
        fields = ["id", "project", "region", "village", "name", "address", "description"]


class SupplyItemSerializer(serializers.ModelSerializer):
    """A supply a worker can pick in a delivery row. Used by GET /api/supply-items/.

    - `quantity_kind`: "count" (positive whole numbers) or "measure" (positive
      decimals). Derived from `unit`, so it is read-only and never stored.
    """
    quantity_kind = serializers.ReadOnlyField()

    class Meta:
        model = SupplyItem
        fields = ["id", "name", "category", "unit", "quantity_kind"]
