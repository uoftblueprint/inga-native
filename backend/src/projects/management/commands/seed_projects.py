from decimal import Decimal
from django.core.management.base import BaseCommand
from projects.models import Project, Region, Site, SupplyItem, Village

"""
just random data
https://99farmers.org/communities/ 

Honduras has 18 deparnment(like states) and there is a capital(head city) for evry department
- Santa Rosa de Copán, Copán, Honduras are 14.766700° N, -88.783300° W
- city of Comayagua in the Comayagua Department,  Honduras are 14.452220° N, -87.638330° W
- Juticalpa, Olancho, Honduras are 14.666390° N, 86.218610° W 
- city of Yoro in Yoro Department, Honduras, are 15.133300° N, 87.133300° W
- La Ceiba, Atlántida department, Honduras are 15.779170° N, -86.793060° W  

assuming each deparment is a region
"""

# Honduran departments, using the coordinates of each department's capital

REGIONS = {
    "Atlántida": ("15.779170", "-86.793060"),  # La Ceiba
    "Yoro": ("15.133300", "-87.133300"),  # Yoro
    "Olancho": ("14.666390", "-86.218610"),  # Juticalpa
    "Comayagua": ("14.452220", "-87.638330"),  # Comayagua
    "Copán": ("14.766700", "-88.783300"),  # Santa Rosa de Copán
}

# Villages inside each region. A farm can optionally be linked to one.
VILLAGES = {
    "Atlántida": ["El Naranjo", "La Esperanza"],
    "Yoro": ["San Isidro"],
}

# (name, category, unit, active). quantity_kind comes from the unit.
SUPPLY_ITEMS = [
    ("Inga seeds", "seed", "seeds", True),
    ("Inga seedlings", "seedling", "seedlings", True),
    ("Citrus seeds", "seed", "seeds", True),
    ("Citrus saplings", "sapling", "saplings", True),
    ("Compost", "other", "kg", True),
    # Inactive on purpose: it must NOT appear in GET /api/supply-items/.
    ("Cacao seedlings (old stock)", "seedling", "seedlings", False),
]

PROJECTS = [
    {
        "name": "Inga Alley Cropping – North Coast",
        "description": "Alley cropping with Inga trees",
        "active": True,
        "log_schema": {
            "Inga seeds": "numerical",
            "Citrus trees": "numerical",
            "Soil tested": "boolean",
            "Notes": "text",
        },
        "sites": [
            # (name, region, village or None, address w/ municipality, description)
            ("Finca El Naranjo", "Atlántida", "El Naranjo", "Aldea El Naranjo, La Ceiba",
             "Steep plot above the river; access by footpath in rainy season."),
            ("Finca La Esperanza", "Atlántida", "La Esperanza", "Aldea La Esperanza, Tela", "New planting this season."),
            ("Finca San Isidro", "Yoro", "San Isidro", "Aldea San Isidro, Olanchito", "Former cattle pasture being restored."),
            ("Finca Las Palmas", "Yoro", None, "Caserío Las Palmas, Yoro", ""),
        ],
    },
    # Inactive on purpose: it must NOT appear in GET /api/projects/.
    {
        "name": "2010 Trial (closed)",
        "description": "Early trial, finished in 2021. Kept for historical records.",
        "active": False,
        "log_schema": {},
        "sites": [
            ("Finca El Encino", "Yoro", None, "Aldea El Encino, Yoro", ""),
        ],
    },
]


class Command(BaseCommand):
    help = "Seeds the database with realistic projects, regions, villages, farms and supply items."

    def handle(self, *args, **options):
        self.stdout.write("Seeding project data...")

        # 1. Regions
        regions = {}
        for name, (lat, lon) in REGIONS.items():
            reg, _ = Region.objects.get_or_create(
                name=name,
                defaults={"latitude": Decimal(lat), "longitude": Decimal(lon)},
            )
            regions[reg.name] = reg

        # 2. Villages
        villages = {}
        for region_name, names in VILLAGES.items():
            for name in names:
                village, _ = Village.objects.get_or_create(region=regions[region_name], name=name)
                villages[(region_name, name)] = village

        # 3. Supply items
        for name, category, unit, active in SUPPLY_ITEMS:
            SupplyItem.objects.get_or_create(
                name=name, defaults={"category": category, "unit": unit, "active": active}
            )

        # 4. Projects, and 5. Sites / Farms inside each one
        for item in PROJECTS:
            project, _ = Project.objects.get_or_create(
                name=item["name"],
                defaults={
                    "description": item["description"],
                    "active": item["active"],
                    "log_schema": item["log_schema"],
                },
            )

            for name, region, village, address, description in item["sites"]:
                Site.objects.get_or_create(
                    project=project,
                    name=name,
                    defaults={
                        "region": regions[region],
                        "village": villages[(region, village)] if village else None,
                        "address": address,
                        "description": description,
                    },
                )

        self.stdout.write(self.style.SUCCESS("Done seeding projects, regions, villages, sites and supply items!"))
