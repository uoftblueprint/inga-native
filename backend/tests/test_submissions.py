import uuid

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from submissions.models import Submission

try:
    from projects.models import Project, Region, Site
except ImportError:
    pytest.skip("Issue #5 project models are not available yet", allow_module_level=True)


pytestmark = pytest.mark.django_db


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


def test_valid_submission_is_created_for_authenticated_user(submission_context):
    user, _, site = submission_context
    submission_uuid = uuid.uuid4()
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/submissions/",
        {
            "site": site.pk,
            "uuid": str(submission_uuid),
            "metadata": {"Inga seeds": 40, "Soil tested": True, "Notes": "Dry"},
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["site"] == site.pk
    assert response.data["uuid"] == str(submission_uuid)
    assert Submission.objects.get(uuid=submission_uuid).user_id == user.pk


@pytest.mark.parametrize(
    ("metadata", "field_name"),
    [
        ({"Soil tsted": True}, "Soil tsted"),
        ({"Inga seeds": "forty"}, "Inga seeds"),
    ],
)
def test_invalid_metadata_names_the_invalid_field(submission_context, metadata, field_name):
    user, _, site = submission_context
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/submissions/",
        {"site": site.pk, "uuid": str(uuid.uuid4()), "metadata": metadata},
        format="json",
    )

    assert response.status_code == 400
    assert field_name in str(response.data["metadata"])


def test_empty_metadata_is_rejected(submission_context):
    user, _, site = submission_context
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/submissions/",
        {"site": site.pk, "uuid": str(uuid.uuid4()), "metadata": {}},
        format="json",
    )

    assert response.status_code == 400
    assert "metadata" in response.data


def test_list_returns_only_authenticated_users_submissions(submission_context):
    user, other_user, site = submission_context
    Submission.objects.create(
        site=site,
        user=user,
        uuid=uuid.uuid4(),
        metadata={"Inga seeds": 40},
    )
    Submission.objects.create(
        site=site,
        user=other_user,
        uuid=uuid.uuid4(),
        metadata={"Inga seeds": 20},
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/submissions/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["metadata"] == {"Inga seeds": 40}