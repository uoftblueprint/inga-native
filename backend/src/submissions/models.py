from django.conf import settings
from django.db import models


class Submission(models.Model):
	site = models.ForeignKey("projects.Site", on_delete=models.PROTECT)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
	uuid = models.UUIDField(unique=True)
	recorded_at = models.DateTimeField(null=True, blank=True)
	metadata = models.JSONField(default=dict)
	expected_photo_ids = models.JSONField(default=list)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return str(self.uuid)


class SubmissionDelivery(models.Model):
	submission = models.ForeignKey(
		Submission, on_delete=models.CASCADE, related_name="deliveries"
	)
	item = models.ForeignKey("projects.SupplyItem", on_delete=models.PROTECT)
	quantity = models.DecimalField(max_digits=20, decimal_places=6)

	class Meta:
		constraints = [
			models.UniqueConstraint(
				fields=["submission", "item"],
				name="unique_delivery_item_per_submission",
			)
		]
