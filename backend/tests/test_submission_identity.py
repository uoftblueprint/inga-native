import pytest
from rest_framework.test import APIClient

from submissions.models import Submission


pytestmark = pytest.mark.django_db


def test_submission_can_generate_its_uuid(submission_context):
    user, _, site = submission_context
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/submissions/",
        {"site": site.pk, "metadata": {"Inga seeds": 40}},
        format="json",
    )

    assert response.status_code == 201
    assert Submission.objects.get(uuid=response.data["uuid"]).user_id == user.pk
    assert "id" not in response.data


def test_invalid_submission_uuid_returns_a_validation_error(submission_context):
    user, _, site = submission_context
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        "/api/submissions/",
        {
            "site": site.pk,
            "uuid": "invalid-uuid",
            "metadata": {"Inga seeds": 40},
        },
        format="json",
    )

    assert response.status_code == 400
    assert "uuid" in response.data
    assert not Submission.objects.exists()
