from decimal import Decimal
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from projects.models import Project, Region, Site
from io import StringIO
from django.core.management import call_command


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


@pytest.mark.django_db
def test_get_projects_returns_only_active(auth_client, test_data):
    """GET /api/projects/ returns 200 and excludes inactive projects."""
    res = auth_client.get("/api/projects/")
    assert res.status_code == 200

    data = res.json()
    names = [p["name"] for p in data]

    assert "Active Project" in names
    assert "Inactive Project" not in names


@pytest.mark.django_db
def test_get_sites_returns_sites_with_region(auth_client, test_data):
    """GET /api/projects/<id>/sites/ returns sites and nested region info."""
    project_id = test_data["active"].id
    res = auth_client.get(f"/api/projects/{project_id}/sites/")
    assert res.status_code == 200

    data = res.json()
    assert len(data) == 2
    assert data[0]["region"]["name"] == "Test Valley"
    assert "latitude" in data[0]["region"]


@pytest.mark.django_db
def test_sites_avoids_n_plus_one_queries(auth_client, test_data, django_assert_num_queries):
    """Verifies that select_related('region') runs only 1 query for sites."""
    project_id = test_data["active"].id

    with django_assert_num_queries(1):
        res = auth_client.get(f"/api/projects/{project_id}/sites/")
        assert res.status_code == 200


@pytest.mark.django_db
def test_endpoints_require_auth():
    """Unauthenticated requests should return 401."""
    anon = APIClient()
    assert anon.get("/api/projects/").status_code == 401
    assert anon.get("/api/projects/1/sites/").status_code == 401


@pytest.fixture
def seeded():
    """Run the seed command the same way `manage.py seed_projects` would.
    stdout=StringIO() swallows its "Seeding..." messages so they don't clutter
    the test output."""
    call_command("seed_projects", stdout=StringIO())


@pytest.mark.django_db
def test_seeded_projects_endpoint(auth_client, seeded):
    """Against the seed data, only the active programme is listed."""
    res = auth_client.get("/api/projects/")
    assert res.status_code == 200

    names = [p["name"] for p in res.json()]
    assert names == ["Inga Alley Cropping – North Coast"]


@pytest.mark.django_db
def test_seeded_sites_endpoint(auth_client, seeded):
    """Against the seed data, the active programme's 4 farms come back, each
    with its region."""
    project = Project.objects.get(name="Inga Alley Cropping – North Coast")

    res = auth_client.get(f"/api/projects/{project.id}/sites/")
    assert res.status_code == 200

    farms = {f["name"]: f["region"]["name"] for f in res.json()}
    assert farms == {
        "Finca El Naranjo": "Atlántida",
        "Finca La Esperanza": "Atlántida",
        "Finca San Isidro": "Yoro",
        "Finca Las Palmas": "Yoro",
    }


@pytest.mark.django_db
def test_seed_command_twice_makes_no_duplicates(seeded):
    """Running the seed again must not add more rows (get_or_create)."""
    counts = (Region.objects.count(), Project.objects.count(), Site.objects.count())

    call_command("seed_projects", stdout=StringIO())

    assert (Region.objects.count(), Project.objects.count(), Site.objects.count()) == counts


@pytest.mark.django_db
def test_response_fields(auth_client, test_data):
    """The exact keys each endpoint sends. If this fails, the JSON the app
    relies on changed: tell whoever builds the screens."""
    project = auth_client.get("/api/projects/").json()[0]
    assert set(project) == {"id", "name", "description", "active", "log_schema"}

    site = auth_client.get(f"/api/projects/{test_data['active'].id}/sites/").json()[0]
    assert set(site) == {"id", "project", "region", "name", "address", "description"}
    assert set(site["region"]) == {"id", "name", "latitude", "longitude"}


@pytest.mark.django_db
def test_sites_only_from_requested_project(auth_client, test_data):
    """Farms from a different programme must not leak into this list."""
    other = Project.objects.create(name="Other Project", description="x")
    Site.objects.create(project=other, region=test_data["region"], name="Other Farm")

    res = auth_client.get(f"/api/projects/{test_data['active'].id}/sites/")

    assert "Other Farm" not in [s["name"] for s in res.json()]


# @pytest.mark.django_db
# def test_unknown_project_returns_empty_list(auth_client):
#     """The doc's view filters farms by id without looking the project up,
#     so an id that doesn't exist gives an empty list, not a 404."""
#     res = auth_client.get("/api/projects/99999/sites/")
#
#     assert res.status_code == 200
#     assert res.json() == []
