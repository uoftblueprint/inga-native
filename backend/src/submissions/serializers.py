from decimal import Decimal, InvalidOperation
from rest_framework import serializers

from projects.models import QuantityKind, Site, SupplyItem

from .models import Submission, SubmissionDelivery


class SubmissionSerializer(serializers.ModelSerializer):
    deliveries = serializers.ListField(write_only=True, required=False, default=list)
    expected_photo_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )

    class Meta:
        model = Submission
        fields = [
            "uuid",
            "site",
            "recorded_at",
            "deliveries",
            "metadata",
            "expected_photo_ids",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_deliveries(self, value):
        seen = set()
        errors = {}
        validated = []
        for index, row in enumerate(value):
            if not isinstance(row, dict):
                errors[index] = "Delivery must be an object."
                continue
            if set(row) != {"item", "quantity"}:
                errors[index] = "Delivery must contain only item and quantity."
                continue
            try:
                item_id = int(row["item"])
            except (TypeError, ValueError):
                errors[index] = {"item": "Item must be an integer ID."}
                continue
            if item_id in seen:
                errors[index] = {"item": "This item is duplicated."}
                continue
            seen.add(item_id)
            try:
                item = SupplyItem.objects.get(pk=item_id, active=True)
            except SupplyItem.DoesNotExist:
                errors[index] = {"item": "This item is unknown or inactive."}
                continue
            try:
                quantity = Decimal(str(row["quantity"]))
            except (InvalidOperation, TypeError, ValueError):
                errors[index] = {"quantity": "Quantity must be a number."}
                continue
            if not quantity.is_finite() or quantity <= 0:
                errors[index] = {"quantity": "Quantity must be positive."}
                continue
            if (
                item.quantity_kind == QuantityKind.COUNT
                and quantity != quantity.to_integral_value()
            ):
                errors[index] = {"quantity": "Quantity must be a whole number."}
                continue
            validated.append({"item": item, "quantity": quantity})
        if errors:
            raise serializers.ValidationError(errors)
        return validated

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Metadata must be an object.")
        schema = self.initial_data.get("site")
        try:
            site = self.fields["site"].queryset.get(pk=schema)
        except (TypeError, ValueError, Site.DoesNotExist):
            return value
        log_schema = site.project.log_schema
        errors = {}
        for field_name, field_value in value.items():
            if field_name not in log_schema:
                errors[field_name] = "Unknown field."
            elif not self._matches_type(field_value, log_schema[field_name]):
                errors[field_name] = "Wrong type."
        if errors:
            raise serializers.ValidationError(errors)
        return value

    def validate_expected_photo_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Photo IDs must be unique.")
        return value

    def validate(self, attrs):
        metadata = attrs.get("metadata", {})
        deliveries = attrs.get("deliveries", [])
        photos = attrs.get("expected_photo_ids", [])
        if not deliveries and not self._meaningful_metadata(metadata) and not photos:
            raise serializers.ValidationError(
                {
                    "metadata": (
                        "A submission must contain deliveries, meaningful metadata, "
                        "or expected photos."
                    )
                }
            )
        return attrs

    def create(self, validated_data):
        deliveries = validated_data.pop("deliveries", [])
        validated_data["expected_photo_ids"] = [
            str(photo_id) for photo_id in validated_data.get("expected_photo_ids", [])
        ]
        submission = Submission.objects.create(**validated_data, user=self.context["request"].user)
        SubmissionDelivery.objects.bulk_create(
            [
                SubmissionDelivery(
                    submission=submission, item=row["item"], quantity=row["quantity"]
                )
                for row in deliveries
            ]
        )
        return submission

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["deliveries"] = [
            {"item": delivery.item_id, "quantity": _format_quantity(delivery.quantity)}
            for delivery in instance.deliveries.select_related("item").order_by("item_id")
        ]
        return data

    @staticmethod
    def _meaningful_metadata(metadata):
        return any(not (isinstance(value, str) and not value.strip()) for value in metadata.values())

    @staticmethod
    def _matches_type(value, declared_type):
        return {
            "numerical": isinstance(value, (int, float)) and not isinstance(value, bool),
            "boolean": isinstance(value, bool),
            "text": isinstance(value, str),
        }.get(declared_type, False)


def _format_quantity(value):
    formatted = format(value, "f").rstrip("0").rstrip(".")
    return formatted or "0"
