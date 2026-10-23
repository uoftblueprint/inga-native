import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


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

class MeEndpointTests(APITestCase):
    def test_me_returns_logged_in_user(self):
        user = get_user_model().objects.create_user(
            username="jsmith", password="testpassword123", first_name="John", last_name="Smith"
        )
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        response = self.client.get("/api/accounts/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], user.id)
        self.assertEqual(response.data["username"], user.username)
        self.assertEqual(response.data["first_name"], user.first_name)
        self.assertEqual(response.data["last_name"], user.last_name)
        self.assertNotIn("password", response.data)

    def test_me_requires_authentication(self):
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, 401)