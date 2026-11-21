"""API tests for GET /api/supply-items/ and village details in farm responses (issue #27)."""
import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from projects.models import Project, Region, Site, SupplyItem, Village

SUPPLY_URL = "/api/supply-items/"


@pytest.fixture
def client_logged_in(db):
    user = get_user_model().objects.create_user(username="worker", password="password123")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def farms(db):
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


def _sites_by_name(client, project):
    res = client.get(f"/api/projects/{project.id}/sites/")
    assert res.status_code == 200
    return {farm["name"]: farm for farm in res.json()}


# GET /api/supply-items/


def test_supply_items_requires_login(db):
    assert APIClient().get(SUPPLY_URL).status_code == 401


def test_supply_items_returns_only_active(client_logged_in):
    SupplyItem.objects.create(name="Inga seedlings", category="seedling", unit="seedlings")
    SupplyItem.objects.create(name="Old cacao", category="seedling", unit="seedlings", active=False)

    res = client_logged_in.get(SUPPLY_URL)

    assert res.status_code == 200
    assert [item["name"] for item in res.json()] == ["Inga seedlings"]


def test_supply_item_fields_and_quantity_kind(client_logged_in):
    seedlings = SupplyItem.objects.create(name="Inga seedlings", category="seedling", unit="seedlings")
    compost = SupplyItem.objects.create(name="Compost", category="other", unit="kg")

    items = {item["id"]: item for item in client_logged_in.get(SUPPLY_URL).json()}

    assert items[seedlings.id] == {
        "id": seedlings.id, "name": "Inga seedlings", "category": "seedling",
        "unit": "seedlings", "quantity_kind": "count",
    }
    assert items[compost.id] == {
        "id": compost.id, "name": "Compost", "category": "other",
        "unit": "kg", "quantity_kind": "measure",
    }


def test_quantity_kind_is_not_writable_and_endpoint_is_read_only(client_logged_in):
    res = client_logged_in.post(
        SUPPLY_URL, {"name": "New", "category": "other", "unit": "kg"}, format="json"
    )
    assert res.status_code == 405  # workers can't create items
    assert not SupplyItem.objects.filter(name="New").exists()


def test_deactivated_item_still_exists_but_leaves_dropdown(client_logged_in):
    item = SupplyItem.objects.create(name="Inga seeds", category="seed", unit="seeds")
    item.active = False
    item.save()

    assert client_logged_in.get(SUPPLY_URL).json() == []
    assert SupplyItem.objects.filter(pk=item.pk).exists()


# Farm responses


def test_farm_includes_nested_village(client_logged_in, farms):
    farm = _sites_by_name(client_logged_in, farms["project"])["Finca El Naranjo"]
    assert farm["village"] == {
        "id": farms["village"].id, "name": "El Naranjo", "region": farms["region"].id,
    }


def test_farm_without_village_returns_null(client_logged_in, farms):
    farm = _sites_by_name(client_logged_in, farms["project"])["Finca Las Palmas"]
    assert farm["village"] is None


def test_farm_keeps_region_address_and_description(client_logged_in, farms):
    farm = _sites_by_name(client_logged_in, farms["project"])["Finca El Naranjo"]
    assert set(farm) == {"id", "project", "region", "village", "name", "address", "description"}
    assert farm["address"] == "Aldea El Naranjo"
    assert farm["region"]["name"] == "Atlántida"
    assert set(farm["region"]) == {"id", "name", "latitude", "longitude"}


def test_farm_list_query_count_does_not_grow_with_villages(client_logged_in, farms):
    # Add more farms with villages; select_related should keep it to one SELECT.
    for i in range(5):
        v = Village.objects.create(region=farms["region"], name=f"Village {i}")
        Site.objects.create(project=farms["project"], region=farms["region"], village=v, name=f"Farm {i}")

    with CaptureQueriesContext(connection) as ctx:
        res = client_logged_in.get(f"/api/projects/{farms['project'].id}/sites/")
    assert res.status_code == 200

    # Only count SELECTs: ATOMIC_REQUESTS also adds SAVEPOINT/RELEASE statements.
    selects = [q for q in ctx.captured_queries if q["sql"].lstrip().upper().startswith("SELECT")]
    assert len(selects) == 1
