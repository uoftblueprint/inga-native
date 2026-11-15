from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
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


class Village(StandardModel):
    """A village within a region. Sites can optionally be linked to one."""

    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="villages")
    name = models.CharField(max_length=200)

    # note: timestamps and active come from StandardModel

    class Meta:
        constraints = [
            models.UniqueConstraint(
                "region", Lower("name"), name="unique_village_name_per_region_ci"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.region})"


class Site(StandardModel):
    """A farm where a project is carried out."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    region = models.ForeignKey(Region, on_delete=models.PROTECT)
    village = models.ForeignKey(
        Village, on_delete=models.PROTECT, null=True, blank=True, related_name="sites"
    )
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

    def clean(self):
        super().clean()
        # A site's village (if any) must be in the site's region.
        if self.village_id and self.region_id and self.village.region_id != self.region_id:
            raise ValidationError(
                {"village": "The selected village does not belong to the selected region."}
            )

    def __str__(self):
        return f"{self.name} ({self.project})"


class SupplyCategory(models.TextChoices):
    SEED = "seed", "Seeds"
    SEEDLING = "seedling", "Seedlings"
    SAPLING = "sapling", "Saplings"
    OTHER = "other", "Other"


class QuantityKind(models.TextChoices):
    COUNT = "count", "Count"      # positive whole numbers
    MEASURE = "measure", "Measure"  # positive decimals


UNIT_DEFINITIONS = {
    "unit": ("Units", QuantityKind.COUNT),
    "bag": ("Bags", QuantityKind.COUNT),
    "kg": ("Kilograms", QuantityKind.MEASURE),
    "g": ("Grams", QuantityKind.MEASURE),
    "lb": ("Pounds", QuantityKind.MEASURE),
}
UNIT_CHOICES = [(code, label) for code, (label, _) in UNIT_DEFINITIONS.items()]


class SupplyItem(StandardModel):
    """Something a field worker can deliver."""

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=SupplyCategory.choices)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES)

    # note: timestamps and active come from StandardModel

    class Meta:
        constraints = [
            models.UniqueConstraint(Lower("name"), name="unique_supply_item_name_ci"),
        ]

    @property
    def quantity_kind(self):
        return UNIT_DEFINITIONS[self.unit][1]

    def validate_quantity(self, quantity):
        """Raise ValidationError unless quantity fits this item's unit."""
        try:
            value = Decimal(str(quantity))
        except (InvalidOperation, ValueError):
            raise ValidationError("Quantity must be a number.")
        if not value.is_finite() or value <= 0:
            raise ValidationError("Quantity must be positive.")
        if self.quantity_kind == QuantityKind.COUNT and value != value.to_integral_value():
            raise ValidationError(f"{self.get_unit_display()} must be a whole number.")

    def __str__(self):
        return f"{self.name} ({self.get_unit_display()})"
