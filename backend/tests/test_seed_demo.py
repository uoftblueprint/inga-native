"""Development seed behavior on the current and village/supply schemas."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.apps import apps
from django.core.management import CommandError, call_command

from projects.models import Project, Region, Site

pytestmark = pytest.mark.django_db
PROJECT_NAME = "Inga Alley Cropping – North Coast"


def seed(**options):
    output = StringIO()
    call_command("seed_demo", stdout=output, **options)
    return output.getvalue()


@pytest.fixture
def catalogue_models():
    try:
        return apps.get_model("projects", "Village"), apps.get_model("projects", "SupplyItem")
    except LookupError:
        pytest.skip("Village/supply checks apply once the catalogue models are available.")


def test_default_seed_provides_100_farms_and_varied_search_examples():
    seed()
    project = Project.objects.get(name=PROJECT_NAME)
    farms = Site.objects.filter(project=project)
    assert farms.count() == 100
    assert farms.filter(name="Finca El Naranjo").exists()
    assert farms.filter(name__startswith="Finca El Naranjo Demo").count() == 96
    assert farms.filter(address="").exists()
    assert farms.values("region_id").distinct().count() == 5
    assert Project.objects.filter(active=False).exists()


def test_rerun_retains_records_custom_answers_and_admin_edits():
    seed()
    project = Project.objects.get(name=PROJECT_NAME)
    project.log_schema = {"Custom question": "text"}
    project.save(update_fields=["log_schema"])
    farm = Site.objects.get(project=project, name="Finca El Naranjo Demo 005")
    farm.address = "Developer's edited address"
    farm.active = False
    farm.save(update_fields=["address", "active"])
    counts = (Project.objects.count(), Region.objects.count(), Site.objects.count())
    seed()
    farm.refresh_from_db()
    project.refresh_from_db()
    assert farm.address == "Developer's edited address"
    assert farm.active is False
    assert project.log_schema == {"Custom question": "text"}
    assert counts == (Project.objects.count(), Region.objects.count(), Site.objects.count())


def test_requested_farm_count_is_used():
    seed(farms=8)
    assert Site.objects.filter(project__name=PROJECT_NAME).count() == 8


def test_invalid_count_does_not_create_any_data():
    with pytest.raises(CommandError, match="at least 4"):
        seed(farms=3)
    assert not Region.objects.exists()
    assert not Project.objects.exists()


def test_seed_failure_rolls_back_created_records():
    with patch.object(Site.objects, "get_or_create", side_effect=RuntimeError("write failed")):
        with pytest.raises(RuntimeError, match="write failed"):
            seed()
    assert not Region.objects.exists()
    assert not Project.objects.exists()


def test_optional_catalogue_contains_count_measure_and_inactive_examples(catalogue_models):
    village_model, supply_model = catalogue_models
    seed()
    assert supply_model.objects.get(name="Inga seedlings").quantity_kind == "count"
    assert supply_model.objects.get(name="Compost").quantity_kind == "measure"
    assert supply_model.objects.get(name="Cacao seedlings (old stock)").active is False
    assert village_model.objects.filter(name="El Naranjo").count() == 2
    farms = Site.objects.filter(project__name=PROJECT_NAME)
    assert farms.filter(village__isnull=True).exists()
    assert farms.filter(village__isnull=False).exists()
    for farm in farms.exclude(village=None).select_related("village"):
        assert farm.region_id == farm.village.region_id


def test_existing_seeded_farm_gets_its_missing_village(catalogue_models):
    call_command("seed_projects", stdout=StringIO())
    farm = Site.objects.get(project__name=PROJECT_NAME, name="Finca El Naranjo")
    Site.objects.filter(pk=farm.pk).update(village=None)
    seed()
    farm.refresh_from_db()
    assert farm.village.name == "El Naranjo"
    assert farm.village.region_id == farm.region_id


def test_rerun_preserves_existing_village_supply_units_and_retirement(catalogue_models):
    village_model, supply_model = catalogue_models
    seed()
    farm = Site.objects.get(project__name=PROJECT_NAME, name="Finca El Naranjo")
    chosen = village_model.objects.create(name="Admin's chosen village", region=farm.region)
    farm.village = chosen
    farm.save(update_fields=["village"])
    compost = supply_model.objects.get(name="Compost")
    supply_model.objects.filter(pk=compost.pk).update(active=False, unit="g")
    counts = (village_model.objects.count(), supply_model.objects.count(), Site.objects.count())
    seed()
    farm.refresh_from_db()
    compost.refresh_from_db()
    assert farm.village_id == chosen.pk
    assert compost.active is False
    assert compost.unit == "g"
    assert counts == (village_model.objects.count(), supply_model.objects.count(), Site.objects.count())
