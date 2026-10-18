from rest_framework import status

from .models import Project, Region, Site
from django.urls import reverse

"""
testing endpoints...
"""


def test_site_list_unknown_project_is_404(self):
    response = self.client.get(reverse("project-site-list", args=[99999]))

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


def test_site_list_inactive_project_is_404(self):
    response = self.client.get(reverse("project-site-list", args=[self.closed.id]))

    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
