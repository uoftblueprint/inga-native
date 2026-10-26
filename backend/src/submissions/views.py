from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Submission
from .serializers import SubmissionSerializer


class SubmissionListCreateView(generics.ListCreateAPIView):
	serializer_class = SubmissionSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return Submission.objects.filter(user=self.request.user).order_by("-created_at")

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)
