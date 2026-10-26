from django.conf import settings
from django.db import models


class Submission(models.Model):
	site = models.ForeignKey("projects.Site", on_delete=models.PROTECT)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
	uuid = models.UUIDField(unique=True)
	metadata = models.JSONField()
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return str(self.uuid)
