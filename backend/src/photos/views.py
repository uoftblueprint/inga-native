from uuid import UUID, uuid4

import boto3
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Photo


MAX_CONTENT_TYPE_LENGTH = 255 # 255 characters is the maximum length for a content type string	
PRESIGNED_URL_EXPIRATION_SECONDS = 900 # 900 seconds = 15 minutes
PHOTO_KEY_PREFIX = "photos/"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_url(request):
	content_type = request.data.get("content_type")

	if not content_type:
		return Response(
			{"detail": "content_type is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if (
		not isinstance(content_type, str)
		or len(content_type) > MAX_CONTENT_TYPE_LENGTH
	):
		return Response(
			{"detail": "content_type must be valid."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if content_type not in ("image/jpeg", "image/png"):
		return Response(
			{"detail": "content_type must be image/jpeg or image/png."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	key = f"{PHOTO_KEY_PREFIX}{uuid4()}"
	s3 = boto3.client(
		"s3",
		endpoint_url=settings.R2_ENDPOINT_URL,
		aws_access_key_id=settings.R2_ACCESS_KEY_ID,
		aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
		region_name="auto",
	)
	upload_url = s3.generate_presigned_url(
		"put_object",
		Params={
			"Bucket": settings.R2_BUCKET_NAME,
			"Key": key,
			"ContentType": content_type,
		},
		ExpiresIn=PRESIGNED_URL_EXPIRATION_SECONDS,
	)

	return Response({"key": key, "upload_url": upload_url})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_photo(request):
	key = request.data.get("key")
	content_type = request.data.get("content_type")
	size_bytes = request.data.get("size_bytes")

	if (
		not isinstance(key, str)
		or not key.startswith(PHOTO_KEY_PREFIX)
		or key.count("/") != 1
	):
		return Response(
			{"detail": "key must be a valid photo upload key."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	key_uuid = key.removeprefix(PHOTO_KEY_PREFIX)
	try:
		parsed_key_uuid = UUID(key_uuid)
	except (ValueError, AttributeError):
		return Response(
			{"detail": "key must be a valid photo upload key."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if key != f"{PHOTO_KEY_PREFIX}{parsed_key_uuid}":
		return Response(
			{"detail": "key must be a valid photo upload key."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if not content_type:
		return Response(
			{"detail": "content_type is required."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if (
		not isinstance(content_type, str)
		or len(content_type) > MAX_CONTENT_TYPE_LENGTH
	):
		return Response(
			{"detail": "content_type must be valid."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if content_type not in ("image/jpeg", "image/png"):
		return Response(
			{"detail": "content_type must be image/jpeg or image/png."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	if isinstance(size_bytes, str) and size_bytes.isdecimal():
		size_bytes = int(size_bytes)

	if (
		isinstance(size_bytes, bool)
		or not isinstance(size_bytes, int)
		or size_bytes < 0
	):
		return Response(
			{"detail": "size_bytes must be a non-negative integer."},
			status=status.HTTP_400_BAD_REQUEST,
		)

	photo, _ = Photo.objects.get_or_create(
		key=key,
		defaults={
			"size_bytes": size_bytes,
			"content_type": content_type,
			"uploaded_by": request.user,
		},
	)

	return Response(
		{
			"id": photo.id,
			"key": photo.key,
			"size_bytes": photo.size_bytes,
			"content_type": photo.content_type,
		},
		status=status.HTTP_201_CREATED,
	)
