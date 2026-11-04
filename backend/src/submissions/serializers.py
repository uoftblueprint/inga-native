from rest_framework import serializers

from .models import Submission


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ["id", "site", "uuid", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        metadata = attrs["metadata"]
        if not metadata:
            raise serializers.ValidationError({"metadata": "Metadata must not be empty."})
        if not isinstance(metadata, dict):
            raise serializers.ValidationError({"metadata": "Metadata must be an object."})

        schema = attrs["site"].project.log_schema
        for field_name, value in metadata.items():
            if field_name not in schema:
                raise serializers.ValidationError(
                    {"metadata": f"Unknown field '{field_name}'"}
                )
            if not self._matches_type(value, schema[field_name]):
                raise serializers.ValidationError(
                    {"metadata": f"Field '{field_name}' has the wrong type."}
                )
        return attrs

    @staticmethod
    def _matches_type(value, declared_type):
        return {
            "numerical": isinstance(value, (int, float)) and not isinstance(value, bool),
            "boolean": isinstance(value, bool),
            "text": isinstance(value, str),
        }.get(declared_type, False)