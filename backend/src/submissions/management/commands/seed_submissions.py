from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from projects.models import Site
from submissions.models import Submission
from submissions.serializers import SubmissionSerializer


PROJECT_NAME = "Inga Alley Cropping – North Coast"

# (username, first name, last name)
WORKERS = [
    ("jane.doe", "Jane", "Doe"),
    ("john.smith", "John", "Smith"),
]

# (site name, username, metadata)
SUBMISSIONS = [
    (
        "Finca El Naranjo",
        "jane.doe",
        {
            "Inga seeds": 320,
            "Citrus trees": 48,
            "Soil tested": True,
            "Notes": "Healthy growth; mulch applied around the seedlings.",
        },
    ),
    (
        "Finca El Naranjo",
        "john.smith",
        {
            "Inga seeds": 280,
            "Citrus trees": 42,
            "Soil tested": False,
            "Notes": "Dry week; seedlings watered by hand.",
        },
    ),
    (
        "Finca La Esperanza",
        "jane.doe",
        {
            "Inga seeds": 150,
            "Citrus trees": 24,
            "Soil tested": True,
            "Notes": "New planting checked; no pests found.",
        },
    ),
    (
        "Finca La Esperanza",
        "john.smith",
        {
            "Inga seeds": 175,
            "Citrus trees": 30,
            "Soil tested": False,
            "Notes": "Some leaves yellowing on the eastern slope.",
        },
    ),
    (
        "Finca San Isidro",
        "jane.doe",
        {
            "Inga seeds": 410,
            "Citrus trees": 65,
            "Soil tested": True,
            "Notes": "Pruning completed and shade cover looks good.",
        },
    ),
    (
        "Finca San Isidro",
        "john.smith",
        {
            "Inga seeds": 390,
            "Citrus trees": 60,
            "Soil tested": True,
            "Notes": "Soil compacted near the footpath; aerated the area.",
        },
    ),
    (
        "Finca Las Palmas",
        "jane.doe",
        {
            "Inga seeds": 220,
            "Citrus trees": 35,
            "Soil tested": False,
            "Notes": "Heavy rain last week; minor erosion repaired.",
        },
    ),
    (
        "Finca Las Palmas",
        "john.smith",
        {
            "Inga seeds": 240,
            "Citrus trees": 38,
            "Soil tested": True,
            "Notes": "New shoots appearing after the last cut.",
        },
    ),
    (
        "Finca El Naranjo",
        "jane.doe",
        {
            "Inga seeds": 300,
            "Citrus trees": 45,
            "Soil tested": True,
            "Notes": "Follow-up visit completed; plot looks stable.",
        },
    ),
    (
        "Finca San Isidro",
        "john.smith",
        {
            "Inga seeds": 365,
            "Citrus trees": 55,
            "Soil tested": False,
            "Notes": "No issues today; next visit scheduled in two weeks.",
        },
    ),
]


class Command(BaseCommand):
    help = "Seeds the database with mock submissions."

    def handle(self, *args, **options):
        self.stdout.write("Seeding submission data...")

        User = get_user_model()
        for username, first_name, last_name in WORKERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"first_name": first_name, "last_name": last_name},
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])

        for site_name, username, metadata in SUBMISSIONS:
            site = Site.objects.filter(
                project__name=PROJECT_NAME, name=site_name
            ).first()
            if site is None:
                raise CommandError(
                    f"Site '{site_name}' not found. "
                    "Run `python src/manage.py seed_projects` first."
                )

            user = User.objects.get(username=username)
            serializer = SubmissionSerializer(
                data={"site": site.pk, "metadata": metadata}
            )
            serializer.is_valid(raise_exception=True)

            Submission.objects.get_or_create(
                site=site,
                user=user,
                metadata=serializer.validated_data["metadata"],
            )

        self.stdout.write(
            self.style.SUCCESS(f"Done seeding {len(SUBMISSIONS)} submissions!")
        )
