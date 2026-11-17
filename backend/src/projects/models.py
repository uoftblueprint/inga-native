from django.db import models


class Region(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class Project(models.Model):
    name = models.CharField(max_length=200)
    log_schema = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name


class Site(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    region = models.ForeignKey(Region, on_delete=models.PROTECT)
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name


class SupplyCategory(models.TextChoices):
    SEED = "seed", "Seeds"
    SEEDLING = "seedling", "Seedlings"
    SAPLING = "sapling", "Saplings"
    OTHER = "other", "Other"


class QuantityKind(models.TextChoices):
    COUNT = "count", "Count"
    MEASURE = "measure", "Measure"


UNIT_DEFINITIONS = {
    "seeds": ("Seeds", QuantityKind.COUNT),
    "seedlings": ("Seedlings", QuantityKind.COUNT),
    "saplings": ("Saplings", QuantityKind.COUNT),
    "kg": ("Kilograms", QuantityKind.MEASURE),
    "g": ("Grams", QuantityKind.MEASURE),
    "lb": ("Pounds", QuantityKind.MEASURE),
}


class SupplyItem(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=SupplyCategory.choices)
    unit = models.CharField(
        max_length=20,
        choices=[(code, label) for code, (label, _) in UNIT_DEFINITIONS.items()],
    )
    active = models.BooleanField(default=True)

    @property
    def quantity_kind(self):
        return UNIT_DEFINITIONS[self.unit][1]

    def __str__(self):
        return f"{self.name} ({self.get_unit_display()})"
