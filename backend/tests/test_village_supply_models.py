"""Model tests for Village, Site.village and SupplyItem (issue #27)."""
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from projects.models import (
    UNIT_DEFINITIONS,
    Project,
    QuantityKind,
    Region,
    Site,
    SupplyItem,
    Village,
)


@pytest.fixture
def regions(db):
    return (
        Region.objects.create(name="Atlántida"),
        Region.objects.create(name="Yoro"),
    )


@pytest.fixture
def project(db):
    return Project.objects.create(name="Inga Alley Cropping")


@pytest.fixture
def count_item(db):
    return SupplyItem.objects.create(name="Inga seedlings", category="seedling", unit="seedlings")


@pytest.fixture
def measure_item(db):
    return SupplyItem.objects.create(name="Compost", category="other", unit="kg")


# Village uniqueness


def test_same_village_name_allowed_in_different_regions(regions):
    atlantida, yoro = regions
    Village.objects.create(region=atlantida, name="El Naranjo")
    Village.objects.create(region=yoro, name="El Naranjo")
    assert Village.objects.filter(name="El Naranjo").count() == 2


def test_duplicate_village_name_in_same_region_is_rejected(regions):
    Village.objects.create(region=regions[0], name="El Naranjo")
    with pytest.raises(IntegrityError), transaction.atomic():
        Village.objects.create(region=regions[0], name="El Naranjo")


def test_village_name_uniqueness_ignores_case(regions):
    Village.objects.create(region=regions[0], name="El Naranjo")
    with pytest.raises(IntegrityError), transaction.atomic():
        Village.objects.create(region=regions[0], name="el naranjo")


def test_village_defaults_to_active_with_timestamps(regions):
    village = Village.objects.create(region=regions[0], name="El Naranjo")
    assert village.active is True
    assert village.created_at is not None
    assert village.updated_at is not None


def test_region_with_villages_cannot_be_deleted(regions):
    Village.objects.create(region=regions[0], name="El Naranjo")
    with pytest.raises(ProtectedError):
        regions[0].delete()


# Site.village


def test_site_without_village_is_valid(regions, project):
    site = Site(project=project, region=regions[0], name="Finca Las Palmas")
    site.full_clean()  # does not raise
    site.save()
    assert site.village is None


def test_site_with_village_in_same_region_is_valid(regions, project):
    village = Village.objects.create(region=regions[0], name="El Naranjo")
    site = Site(project=project, region=regions[0], village=village, name="Finca El Naranjo")
    site.full_clean()  # does not raise


def test_site_with_village_in_other_region_is_rejected(regions, project):
    atlantida, yoro = regions
    village = Village.objects.create(region=yoro, name="San Isidro")
    site = Site(project=project, region=atlantida, village=village, name="Finca Mala")
    with pytest.raises(ValidationError) as exc:
        site.full_clean()
    assert "village" in exc.value.message_dict


def test_village_used_by_a_site_cannot_be_deleted(regions, project):
    village = Village.objects.create(region=regions[0], name="El Naranjo")
    Site.objects.create(project=project, region=regions[0], village=village, name="Finca El Naranjo")
    with pytest.raises(ProtectedError):
        village.delete()


# SupplyItem


def test_supply_item_defaults_to_active_with_timestamps(count_item):
    assert count_item.active is True
    assert count_item.created_at is not None
    assert count_item.updated_at is not None


def test_supply_item_name_uniqueness_ignores_case(count_item):
    with pytest.raises(IntegrityError), transaction.atomic():
        SupplyItem.objects.create(name="INGA SEEDLINGS", category="seedling", unit="seedlings")


@pytest.mark.parametrize("unit, kind", [(u, k) for u, (_, k) in UNIT_DEFINITIONS.items()])
def test_quantity_kind_comes_from_unit_definition(db, unit, kind):
    item = SupplyItem(name="x", category="other", unit=unit)
    assert item.quantity_kind == kind


def test_unknown_unit_is_rejected(db):
    item = SupplyItem(name="Mystery", category="other", unit="barrels")
    with pytest.raises(ValidationError) as exc:
        item.full_clean()
    assert "unit" in exc.value.message_dict


@pytest.mark.parametrize("quantity", [1, 40, "40", Decimal("3")])
def test_count_accepts_positive_whole_numbers(count_item, quantity):
    assert count_item.quantity_kind == QuantityKind.COUNT
    count_item.validate_quantity(quantity)  # does not raise


@pytest.mark.parametrize("quantity", [2.5, "0.1", Decimal("1.5")])
def test_count_rejects_decimals(count_item, quantity):
    with pytest.raises(ValidationError):
        count_item.validate_quantity(quantity)


@pytest.mark.parametrize("quantity", [2.5, "0.25", 10, Decimal("1.75")])
def test_measure_accepts_positive_decimals(measure_item, quantity):
    assert measure_item.quantity_kind == QuantityKind.MEASURE
    measure_item.validate_quantity(quantity)  # does not raise


@pytest.mark.parametrize("item_fixture", ["count_item", "measure_item"])
@pytest.mark.parametrize("quantity", [0, -1, "-2.5", "abc", None, "nan", "inf"])
def test_rejects_zero_negative_and_non_numbers(request, item_fixture, quantity):
    item = request.getfixturevalue(item_fixture)
    with pytest.raises(ValidationError):
        item.validate_quantity(quantity)
