from django.conf import settings
from django.db import models


class Photo(models.Model):
    """Store metadata for an uploaded photo."""

    key = models.CharField(max_length=1024)

    content_type = models.CharField(max_length=255)

    size_bytes = models.PositiveBigIntegerField()

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="uploaded_photos",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    
    # submission = models.ForeignKey(
    #     "submissions.Submission",
    #     null=True,
    #     blank=True,
    #     on_delete=models.CASCADE,
    # )
