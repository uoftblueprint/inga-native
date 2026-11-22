from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from django.core.management import call_command

from projects.models import Project, Region, Site


@pytest.fixture
def auth_client():
    user = get_user_model().objects.create_user(
        username="fieldworker", password="password123"
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def test_data():
    region = Region.objects.create(
        name="Test Valley", latitude=Decimal("15.70"), longitude=Decimal("-86.70")
    )
    active = Project.objects.create(name="Active Project", active=True, log_schema={"trees": "numerical"})
    inactive = Project.objects.create(name="Inactive Project", active=False)

    site1 = Site.objects.create(project=active, region=region, name="Farm 1")
    site2 = Site.objects.create(project=active, region=region, name="Farm 2")

    return {"active": active, "inactive": inactive, "region": region, "sites": [site1, site2]}


@pytest.fixture
def seeded():
    """Run the seed command the same way `manage.py seed_projects` would.
    stdout=StringIO() swallows its "Seeding..." messages so they don't clutter
    the test output."""
    call_command("seed_projects", stdout=StringIO())
import pytest

from projects.models import Project, Region


@pytest.fixture
def region(db):
    return Region.objects.create(name="Northern District")


@pytest.fixture
def project(db):
    return Project.objects.create(name="Inga Alley Cropping")
from django.contrib.auth import get_user_model


@pytest.fixture
def authenticated_client(client, db):
	user = get_user_model().objects.create_user(
		username="pytest-user",
		password="pytest-password",
	)
	client.force_login(user)
	return client, user
try:
    from projects.models import Project, Region, Site
except ImportError:
    pytest.skip("Issue #5 project models are not available yet", allow_module_level=True)

@pytest.fixture
def submission_context():
    user = get_user_model().objects.create_user(username="worker")
    other_user = get_user_model().objects.create_user(username="other-worker")
    project = Project.objects.create(
        name="Inga project",
        log_schema={
            "Inga seeds": "numerical",
            "Soil tested": "boolean",
            "Notes": "text",
        },
    )
    region = Region.objects.create(name="Central region")
    site = Site.objects.create(project=project, region=region, name="North farm")
    return user, other_user, site


# Fixtures for villages and supply items (issue #27)
from projects.models import SupplyItem, Village


@pytest.fixture
def regions(db):
    """Two regions, for testing village/region rules across regions."""
    return (
        Region.objects.create(name="Atlántida"),
        Region.objects.create(name="Yoro"),
    )


@pytest.fixture
def count_item(db):
    """A supply item counted in whole numbers."""
    return SupplyItem.objects.create(name="Inga seedlings", category="seedling", unit="seedlings")


@pytest.fixture
def measure_item(db):
    """A supply item measured in decimals (kg)."""
    return SupplyItem.objects.create(name="Compost", category="other", unit="kg")


@pytest.fixture
def village_farms(db):
    """A programme with one farm in a village and one farm without a village."""
    region = Region.objects.create(name="Atlántida")
    village = Village.objects.create(region=region, name="El Naranjo")
    project = Project.objects.create(name="Inga Alley Cropping")
    with_village = Site.objects.create(
        project=project, region=region, village=village,
        name="Finca El Naranjo", address="Aldea El Naranjo",
    )
    without_village = Site.objects.create(project=project, region=region, name="Finca Las Palmas")
    return {"project": project, "region": region, "village": village,
            "with_village": with_village, "without_village": without_village}
