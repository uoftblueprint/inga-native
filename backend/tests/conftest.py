import pytest

from projects.models import Project, Region


@pytest.fixture
def region(db):
    return Region.objects.create(name="Northern District")


@pytest.fixture
def project(db):
    return Project.objects.create(name="Inga Alley Cropping")
