import uuid
from datetime import datetime, timezone

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from submissions.models import Submission

try:
    from projects.models import Project, Region, Site, SupplyItem
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


def test_photo_only_submission_is_created(submission_context):
    user, _, site = submission_context
    client = APIClient()
    client.force_authenticate(user=user)
    photo_id = uuid.uuid4()

    response = client.post(
        "/api/submissions/",
        {
            "site": site.pk,
            "uuid": str(uuid.uuid4()),
            "recorded_at": "2026-11-09T14:20:00Z",
            "metadata": {},
            "expected_photo_ids": [str(photo_id)],
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["expected_photo_ids"] == [str(photo_id)]


def test_delivery_is_saved_and_count_quantity_must_be_whole(submission_context):
    user, _, site = submission_context
    item = SupplyItem.objects.create(name="Seeds", category="seed", unit="seeds")
    client = APIClient()
    client.force_authenticate(user=user)
    payload = {
        "site": site.pk,
        "uuid": str(uuid.uuid4()),
        "recorded_at": "2026-11-09T14:20:00Z",
        "deliveries": [{"item": item.pk, "quantity": 40}],
        "metadata": {},
    }

    response = client.post("/api/submissions/", payload, format="json")

    assert response.status_code == 201
    assert response.data["deliveries"] == [{"item": item.pk, "quantity": "40"}]

    payload["uuid"] = str(uuid.uuid4())
    payload["deliveries"][0]["quantity"] = 2.5
    response = client.post("/api/submissions/", payload, format="json")
    assert response.status_code == 400
    assert "whole number" in str(response.data["deliveries"])


def test_identical_retry_returns_saved_submission_and_conflict_is_rejected(
    submission_context,
):
    user, _, site = submission_context
    item = SupplyItem.objects.create(name="Fertilizer", category="other", unit="kg")
    client = APIClient()
    client.force_authenticate(user=user)
    submission_uuid = uuid.uuid4()
    payload = {
        "site": site.pk,
        "uuid": str(submission_uuid),
        "recorded_at": "2026-11-09T14:20:00Z",
        "deliveries": [{"item": item.pk, "quantity": 2.5}],
        "metadata": {"Notes": "North section"},
    }

    created = client.post("/api/submissions/", payload, format="json")
    retry = client.post("/api/submissions/", payload, format="json")
    payload["metadata"]["Notes"] = "Different section"
    conflict = client.post("/api/submissions/", payload, format="json")

    assert created.status_code == 201
    assert retry.status_code == 200
    assert conflict.status_code == 409
    assert Submission.objects.filter(uuid=submission_uuid).count() == 1


def test_invalid_delivery_does_not_create_submission(submission_context):
    user, _, site = submission_context
    item = SupplyItem.objects.create(name="Seeds", category="seed", unit="seeds")
    client = APIClient()
    client.force_authenticate(user=user)
    submission_uuid = uuid.uuid4()

    response = client.post(
        "/api/submissions/",
        {
            "site": site.pk,
            "uuid": str(submission_uuid),
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "deliveries": [
                {"item": item.pk, "quantity": 10},
                {"item": 999999, "quantity": 2},
            ],
            "metadata": {},
        },
        format="json",
    )

    assert response.status_code == 400
    assert not Submission.objects.filter(uuid=submission_uuid).exists()