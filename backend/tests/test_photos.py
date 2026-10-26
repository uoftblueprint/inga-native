from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model

from photos.models import Photo


@pytest.fixture
def authenticated_client(client, db):
    user = get_user_model().objects.create_user(
        username="photo-uploader",
        password="not-a-real-password",
    )
    client.force_login(user)
    return client, user


@pytest.mark.django_db
def test_upload_url_generates_presigned_url(authenticated_client):
    client, _ = authenticated_client
    s3_client = Mock()
    s3_client.generate_presigned_url.return_value = "https://storage/upload"

    with patch("photos.views.boto3.client", return_value=s3_client) as client_mock:
        response = client.post(
            "/api/photos/upload-url/",
            {"content_type": "image/png"},
            format="json",
        )

    assert response.status_code == 200
    assert response.json()["upload_url"] == "https://storage/upload"
    assert response.json()["key"].startswith("photos/")
    client_mock.assert_called_once()
    s3_client.generate_presigned_url.assert_called_once()
    assert s3_client.generate_presigned_url.call_args.kwargs["Params"][
        "ContentType"
    ] == "image/png"


@pytest.mark.django_db
def test_upload_url_rejects_non_image_content_type(authenticated_client):
    client, _ = authenticated_client

    with patch("photos.views.boto3.client") as client_mock:
        response = client.post(
            "/api/photos/upload-url/",
            {"content_type": "application/pdf"},
            format="json",
        )

    assert response.status_code == 400
    client_mock.assert_not_called()


@pytest.mark.django_db
def test_create_photo_records_uploaded_photo(authenticated_client):
    client, user = authenticated_client
    key = f"photos/{uuid4()}"

    response = client.post(
        "/api/photos/",
        {
            "key": key,
            "content_type": "image/jpeg",
            "size_bytes": 2048,
        },
        format="json",
    )

    assert response.status_code == 201, response.json()
    photo = Photo.objects.get(key=key)
    assert photo.uploaded_by == user
    assert photo.content_type == "image/jpeg"
    assert photo.size_bytes == 2048
    assert response.json()["key"] == key


@pytest.mark.django_db
def test_create_photo_is_idempotent_for_same_key(authenticated_client):
    client, user = authenticated_client
    key = f"photos/{uuid4()}"

    first_response = client.post(
        "/api/photos/",
        {"key": key, "content_type": "image/png", "size_bytes": 100},
        format="json",
    )
    second_response = client.post(
        "/api/photos/",
        {"key": key, "content_type": "image/png", "size_bytes": 200},
        format="json",
    )

    assert first_response.status_code == 201, first_response.json()
    assert second_response.status_code == 201
    assert Photo.objects.filter(key=key).count() == 1
    photo = Photo.objects.get(key=key)
    assert photo.uploaded_by == user
    assert photo.size_bytes == 100


@pytest.mark.django_db
def test_create_photo_rejects_invalid_key(authenticated_client):
    client, _ = authenticated_client

    response = client.post(
        "/api/photos/",
        {
            "key": "photos/not-a-valid-uuid",
            "content_type": "image/png",
            "size_bytes": 100,
        },
        format="json",
    )

    assert response.status_code == 400
    assert Photo.objects.count() == 0
