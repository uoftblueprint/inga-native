from datetime import timezone
from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Submission
from .serializers import SubmissionSerializer


class SubmissionListCreateView(generics.ListCreateAPIView):
	serializer_class = SubmissionSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return Submission.objects.filter(user=self.request.user).order_by("-created_at")

	def create(self, request, *args, **kwargs):
		payload = request.data
		submission_uuid = payload.get("uuid")
		if submission_uuid:
			existing = Submission.objects.prefetch_related("deliveries").filter(
				uuid=submission_uuid
			).first()
			if existing is not None:
				return self._existing_response(existing, payload)

		with transaction.atomic():
			serializer = self.get_serializer(data=payload)
			serializer.is_valid(raise_exception=True)
			try:
				with transaction.atomic():
					instance = serializer.save()
			except IntegrityError:
				# A concurrent request won the UUID race. Its completed row is
				# authoritative and is compared exactly like a normal retry.
				instance = Submission.objects.prefetch_related("deliveries").get(
					uuid=payload["uuid"]
				)
				return self._existing_response(instance, payload)
		return Response(
			self.get_serializer(instance).data, status=status.HTTP_201_CREATED
		)

	def _existing_response(self, instance, payload):
		if instance.user_id != self.request.user.id:
			return Response(
				{"detail": "A submission with this UUID already exists."},
				status=status.HTTP_409_CONFLICT,
			)
		try:
			equivalent = _submission_content(instance) == _payload_content(payload)
		except (KeyError, TypeError, ValueError, serializers.ValidationError):
			equivalent = False
		if not equivalent:
			return Response(
				{"detail": "This UUID was already used for different content."},
				status=status.HTTP_409_CONFLICT,
			)
		return Response(self.get_serializer(instance).data, status=status.HTTP_200_OK)


def _submission_content(submission):
	return {
		"site": submission.site_id,
		"recorded_at": (
			submission.recorded_at.astimezone(timezone.utc).isoformat()
			if submission.recorded_at
			else None
		),
		"deliveries": sorted(
			[
				{"item": delivery.item_id, "quantity": _format_quantity(delivery.quantity)}
				for delivery in submission.deliveries.all()
			],
			key=lambda row: row["item"],
		),
		"metadata": submission.metadata,
		"expected_photo_ids": sorted(submission.expected_photo_ids),
	}


def _payload_content(payload):
	recorded_at = payload.get("recorded_at")
	serializer = SubmissionSerializer()
	recorded_at = (
		serializer.fields["recorded_at"].to_internal_value(recorded_at)
		if recorded_at is not None
		else None
	)
	deliveries = [
		{"item": int(row["item"]), "quantity": str(row["quantity"])}
		for row in payload.get("deliveries", [])
	]
	return {
		"site": int(payload["site"]),
		"recorded_at": (
			recorded_at.astimezone(timezone.utc).isoformat()
			if recorded_at
			else None
		),
		"deliveries": sorted(
			[
				{"item": row["item"], "quantity": _format_quantity(Decimal(row["quantity"]))}
				for row in deliveries
			],
			key=lambda row: row["item"],
		),
		"metadata": payload.get("metadata") or {},
		"expected_photo_ids": sorted(str(photo_id) for photo_id in payload.get("expected_photo_ids", [])),
	}


def _format_quantity(value):
	formatted = format(value, "f").rstrip("0").rstrip(".")
	return formatted or "0"
