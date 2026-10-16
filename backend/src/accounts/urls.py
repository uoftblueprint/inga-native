# Mounted at /api/accounts/ by config/urls.py.
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenObtainPairView.as_view(), name="token_refresh")
]
