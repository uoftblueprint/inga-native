import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

LOGIN_URL = "/api/accounts/login/"
REFRESH_URL = "/api/accounts/refresh/"
PROTECTED_URL = "/api/accounts/me/"

USERNAME = "testuser"
PASSWORD = "testpass123"


def test_project_uses_its_own_user_model():
    """Fails if anything points the project back at Django's auth.User."""
    assert get_user_model()._meta.label == "accounts.User"


@pytest.mark.django_db
def test_can_create_a_field_worker():
    user = get_user_model().objects.create_user(
        username="fieldworker",
        password="not-a-real-password",
    )

    assert user.pk is not None
    assert user.check_password("not-a-real-password")


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_me_returns_logged_in_user(api_client):
    user = get_user_model().objects.create_user(
        username="jsmith", password="testpassword123", first_name="John", last_name="Smith"
    )
    token = RefreshToken.for_user(user).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    response = api_client.get("/api/accounts/me/")

    assert response.status_code == 200
    assert response.data["id"] == user.id
    assert response.data["username"] == user.username
    assert response.data["first_name"] == user.first_name
    assert response.data["last_name"] == user.last_name
    assert "password" not in response.data


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    response = api_client.get("/api/accounts/me/")
    assert response.status_code == 401

@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username=USERNAME, password=PASSWORD)


def login(api_client, password=PASSWORD):
    return api_client.post(
        LOGIN_URL, {"username": USERNAME, "password": password}, format="json"
    )


def test_valid_login(api_client, user):
    response = login(api_client)
    assert response.status_code == 200
    assert "access" in response.data and "refresh" in response.data


def test_invalid_login(api_client, user):
    response = login(api_client, password="wrong")
    assert response.status_code == 401
    assert "access" not in response.data


def test_protected_endpoint_requires_token(api_client, db):
    response = api_client.get(PROTECTED_URL)
    assert response.status_code == 401


def test_protected_endpoint_with_token(api_client, user):
    access = login(api_client).data["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    response = api_client.get(PROTECTED_URL)
    assert response.status_code == 200


def test_refresh_returns_new_access_token(api_client, user):
    refresh = login(api_client).data["refresh"]
    response = api_client.post(REFRESH_URL, {"refresh": refresh}, format="json")
    assert response.status_code == 200
    assert "access" in response.data


def test_refresh_with_invalid_token(api_client, db):
    response = api_client.post(REFRESH_URL, {"refresh": "not-a-real-token"}, format="json")
    assert response.status_code == 401
