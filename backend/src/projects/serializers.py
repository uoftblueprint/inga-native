from rest_framework import serializers

from .models import Project, Region, Site

"""
Serializers for the projects app

Before a worker can record anything, the app has to show them which programmes exist and which farms are in each one, 
so they can pick where they are.

RegionSerializer
ProjectSerializer
SiteSerializer
"""


class RegionSerializer(serializers.ModelSerializer):
    """A region a farm sits in
    Note: latitude and longitude are DecimalFields and can be Null
    """

    class Meta:
        model = Region
        fields = ["id", "name", "latitude", "longitude"]


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

     - `id`: what submissions and photos attach to. Required because farm
      names are only unique *within* a programme, so two programmes can each
      have a farm with the same name.
    - `project` is left out on purpose: the app already chose the programme
      to reach this URL, so repeating its id on every farm is redundant.
    """
    region = RegionSerializer(read_only=True)

    class Meta:
        model = Site
        fields = ["id", "project", "region", "name", "address", "description", ]
