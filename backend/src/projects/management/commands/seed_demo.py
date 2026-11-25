"""Extend the existing seed command with repeatable development examples."""

from io import StringIO

from django.apps import apps
from django.core.management import BaseCommand, CommandError, call_command
from django.db import transaction
from django.utils import timezone

from projects.management.commands.seed_projects import PROJECTS, REGIONS
from projects.models import Project, Region, Site


VILLAGES = {
    "Atlántida": ["El Naranjo", "La Esperanza"],
    "Yoro": ["San Isidro", "El Naranjo"],
}
SUPPLIES = [
    ("Inga seeds", "seed", "seeds", True),
    ("Inga seedlings", "seedling", "seedlings", True),
    ("Citrus seeds", "seed", "seeds", True),
    ("Citrus saplings", "sapling", "saplings", True),
    ("Compost", "other", "kg", True),
    ("Cacao seedlings (old stock)", "seedling", "seedlings", False),
]
FARM_VILLAGES = {
    "Finca El Naranjo": "El Naranjo",
    "Finca La Esperanza": "La Esperanza",
    "Finca San Isidro": "San Isidro",
}


def optional_model(name):
    try:
        return apps.get_model("projects", name)
    except LookupError:
        return None


class Command(BaseCommand):
    help = "Add demo farms and any supported village/supply examples to the existing seed data."

    def add_arguments(self, parser):
        parser.add_argument("--farms", type=int, default=100, help="Number of sample farms (default: 100).")

    @transaction.atomic
    def handle(self, *args, **options):
        farm_count = options["farms"]
        original_count = len(PROJECTS[0]["sites"])
        if farm_count < original_count:
            raise CommandError(f"--farms must be at least {original_count}.")

        call_command("seed_projects", stdout=StringIO())
        project = Project.objects.get(name=PROJECTS[0]["name"])
        regions = {region.name: region for region in Region.objects.filter(name__in=REGIONS)}
        village_model = optional_model("Village")
        supply_model = optional_model("SupplyItem")
        has_village_field = "village" in {field.name for field in Site._meta.get_fields()}

        villages = {}
        if village_model is not None:
            for region_name, names in VILLAGES.items():
                for name in names:
                    village, _ = village_model.objects.get_or_create(
                        region=regions[region_name], name__iexact=name, defaults={"name": name}
                    )
                    villages[(region_name, name)] = village

        if supply_model is not None:
            for name, category, unit, active in SUPPLIES:
                supply_model.objects.get_or_create(
                    name__iexact=name,
                    defaults={"name": name, "category": category, "unit": unit, "active": active},
                )

        if has_village_field:
            for site in Site.objects.filter(project=project, name__in=FARM_VILLAGES):
                village = villages.get((site.region.name, FARM_VILLAGES[site.name]))
                self.fill_missing_village(site, village)

        region_list = [regions[name] for name in REGIONS]
        for index in range(original_count + 1, farm_count + 1):
            region = region_list[(index - original_count - 1) % len(region_list)]
            names = VILLAGES.get(region.name, [])
            village = (
                villages.get((region.name, names[index % len(names)]))
                if names and index % 3 else None
            )
            name = f"Finca El Naranjo Demo {index:03d}"
            defaults = {
                "name": name,
                "region": region,
                "address": "" if index % 4 == 0 else f"Demo route {index}, {region.name}",
                "description": "Sample farm for development and search testing.",
            }
            if has_village_field:
                defaults["village"] = village
            site, _ = Site.objects.get_or_create(
                project=project, name__iexact=name, defaults=defaults
            )
            if has_village_field:
                self.fill_missing_village(site, village)

        if village_model is None or supply_model is None:
            self.stdout.write("Village/supply examples are added when their models are available.")
        self.stdout.write(self.style.SUCCESS(
            f"Demo data ready for {farm_count} sample farms; existing edits and records retained."
        ))

    @staticmethod
    def fill_missing_village(site, village):
        if village is not None:
            # Fill a missing link without replacing an admin's chosen location.
            Site.objects.filter(
                pk=site.pk, village__isnull=True, region_id=village.region_id
            ).update(village=village, updated_at=timezone.now())
