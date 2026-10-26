from django.db import models
from django.db.models.functions import Lower
from django.core.validators import MaxValueValidator, MinValueValidator
from .validators import validate_log_schema


class StandardModel(models.Model):
    """Adds created_at, updated_at, and an active flag to any model that inherits from it. """

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class Region(StandardModel):
    """A geographic area that sites belong to."""

    name = models.CharField(max_length=200)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )

    # note: timestamps come from StandardModel
    # note: active also comes from StandardModel

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("name"), name="unique_region_name_ci"),
        ]

    def __str__(self):
        return self.name


class Project(StandardModel):
    """A tree planting programme."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    log_schema = models.JSONField(default=dict, blank=True, validators=[validate_log_schema])

    # note: timestamps come from StandardModel
    # note: has active field

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("name"), name="unique_project_name_ci"),
        ]

    def __str__(self):
        return self.name


class Site(StandardModel):
    """A farm where a project is carried out."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    region = models.ForeignKey(Region, on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255, blank=True) # can be description of location if no street address
    description = models.TextField(blank=True) # can be notes about the farm, or have names of workers

    # note: timestamps come from StandardModel
    # note: has active field

    class Meta:
        constraints = [
            models.UniqueConstraint(
                "project", Lower("name"), name="unique_site_name_per_project"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.project})"
