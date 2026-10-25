from django.core.exceptions import ValidationError

LOG_SCHEMA_TYPES = ("numerical", "boolean", "text")


def validate_log_schema(value):
    if not isinstance(value, dict):
        raise ValidationError('log_schema must be a JSON object, i.e., {"Notes": "text"}.')
    for label, kind in value.items():
        if kind not in LOG_SCHEMA_TYPES:
            raise ValidationError(
                f"'{label}' has unknown type '{kind}'. Use numerical, boolean or text."
            )