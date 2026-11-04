import uuid
from django.conf import settings
from django.db import models
from projects import Site


class Submission(models.Model):
	site = models.ForeignKey(Site, on_delete=models.PROTECT)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
	uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
 )
	metadata = models.JSONField()
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return str(self.uuid)
