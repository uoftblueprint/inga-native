import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from projects.models import Project, Region, Site


@pytest.fixture
def region(db):
    return Region.objects.create(name="Northern District")


@pytest.fixture
def project(db):
    return Project.objects.create(name="Inga Alley Cropping")


# test uniqueness


@pytest.mark.django_db
def test_duplicate_region_name_is_rejected(region):
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Region.objects.create(name="Northern District")


@pytest.mark.django_db
def test_region_name_ignores_case(region):
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Region.objects.create(name="northern district")


@pytest.mark.django_db
def test_duplicate_project_name_is_rejected(project):
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Project.objects.create(name="Inga Alley Cropping")


@pytest.mark.django_db
def test_duplicate_site_name_in_same_project_is_rejected(project, region):
    Site.objects.create(project=project, region=region, name="Smith Farm")

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Site.objects.create(project=project, region=region, name="Smith Farm")


@pytest.mark.django_db
def test_site_name_ignores_case_within_a_project(project, region):
    Site.objects.create(project=project, region=region, name="Smith Farm")

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Site.objects.create(project=project, region=region, name="smith farm")


@pytest.mark.django_db
def test_same_site_name_is_allowed_in_a_different_project(project, region):
    other_project = Project.objects.create(name="Citrus Restoration")
    Site.objects.create(project=project, region=region, name="Smith Farm")

    site = Site.objects.create(project=other_project, region=region, name="Smith Farm")

    assert site.pk is not None


# test uniqueness for admin side


@pytest.mark.django_db
def test_duplicate_site_name_fails_full_clean(project, region):
    Site.objects.create(project=project, region=region, name="Smith Farm")

    duplicate = Site(project=project, region=region, name="Smith Farm")

    with pytest.raises(ValidationError):
        duplicate.full_clean()


# log_schema


@pytest.mark.django_db
def test_valid_log_schema_is_accepted():
    project = Project(
        name="Valid",
        log_schema={
            "Citrus trees": "numerical",
            "Soil tested": "boolean",
            "Notes": "text",
        },
    )

    project.full_clean()


@pytest.mark.django_db
def test_empty_log_schema_is_accepted():
    Project(name="Empty").full_clean()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "bad_schema",
    [
        {"Citrus trees": "number"},  # unknown type
        {"Citrus trees": "Numerical"},  # wrong capitalisation
        {"Citrus trees": 5},  # not a string
        {"Citrus trees": ["text"]},  # list instead of a string
        ["numerical", "text"],  # not a dict
    ],
)
def test_bad_log_schema_is_rejected(bad_schema):
    project = Project(name="Bad", log_schema=bad_schema)

    with pytest.raises(ValidationError) as error:
        project.full_clean()

    assert "log_schema" in error.value.message_dict


# test coordinates


@pytest.mark.django_db
@pytest.mark.parametrize(
    "latitude, longitude",
    [(91, 0), (-91, 0), (0, 181), (0, -181)],
)
def test_out_of_range_coordinates_are_rejected(latitude, longitude):
    region = Region(name="Bad", latitude=latitude, longitude=longitude)

    with pytest.raises(ValidationError):
        region.full_clean()


@pytest.mark.django_db
def test_missing_coordinates_are_accepted():
    Region(name="No coordinates").full_clean()