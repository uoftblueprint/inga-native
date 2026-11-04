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
