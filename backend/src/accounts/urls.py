from django.urls import path

from . import views

# Mounted at /api/accounts/ by config/urls.py.
urlpatterns = [
    path("me/", views.me, name="me"),
]
