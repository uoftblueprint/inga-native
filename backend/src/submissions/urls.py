from django.urls import path

from .views import SubmissionListCreateView


urlpatterns = [
	path("", SubmissionListCreateView.as_view(), name="submission-list-create"),
]
