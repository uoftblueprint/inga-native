from uuid import uuid4

import boto3
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .constants import (
	PRESIGNED_URL_EXPIRATION_SECONDS,
	PHOTO_KEY_PREFIX,
)
from .models import Photo
from .serializers import ContentTypeSerializer, CreatePhotoSerializer

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_url(request: Request) -> Response:
	serializer = ContentTypeSerializer(data=request.data)
	serializer.is_valid(raise_exception=True)
	content_type = serializer.validated_data["content_type"]

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
def create_photo(request: Request) -> Response:
	serializer = CreatePhotoSerializer(data=request.data)
	serializer.is_valid(raise_exception=True)
	key = serializer.validated_data["key"]
	content_type = serializer.validated_data["content_type"]
	size_bytes = serializer.validated_data["size_bytes"]

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
