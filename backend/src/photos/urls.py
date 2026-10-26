# Mounted at /api/accounts/ by config/urls.py.
from django.urls import path

from .views import create_photo, upload_url

urlpatterns = [
	path("upload-url/", upload_url, name="photo-upload-url"),
	path("", create_photo, name="photo-create"),
]
