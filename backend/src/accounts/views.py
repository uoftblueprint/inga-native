from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .serializers import UserSerializer

@api_view(["GET"])
@authentication_classes([JWTAuthentication]) # TODO: remove after merging with issue #7
@permission_classes([IsAuthenticated]) # TODO: remove after merging with issue #7
def me(request):
    return Response(UserSerializer(request.user).data)