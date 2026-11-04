from uuid import UUID

from rest_framework import serializers

from .constants import MAX_CONTENT_TYPE_LENGTH, PHOTO_KEY_PREFIX


class ContentTypeSerializer(serializers.Serializer):
	content_type: serializers.CharField = serializers.CharField(
		max_length=MAX_CONTENT_TYPE_LENGTH,
		allow_blank=False,
	)

	def validate_content_type(self, value: str) -> str:
		if value not in ("image/jpeg", "image/png"):
			raise serializers.ValidationError(
				"content_type must be image/jpeg or image/png."
			)
		return value


class CreatePhotoSerializer(ContentTypeSerializer):
	key: serializers.CharField = serializers.CharField()
	size_bytes: serializers.IntegerField = serializers.IntegerField(min_value=0)

	def validate_key(self, value: str) -> str:
		if (
			not value.startswith(PHOTO_KEY_PREFIX)
			or value.count("/") != 1
		):
			raise serializers.ValidationError(
				"key must be a valid photo upload key."
			)

		key_uuid = value.removeprefix(PHOTO_KEY_PREFIX)
		try:
			parsed_key_uuid = UUID(key_uuid)
		except (ValueError, AttributeError):
			raise serializers.ValidationError(
				"key must be a valid photo upload key."
			)

		if value != f"{PHOTO_KEY_PREFIX}{parsed_key_uuid}":
			raise serializers.ValidationError(
				"key must be a valid photo upload key."
			)

		return value
