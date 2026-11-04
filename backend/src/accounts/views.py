from rest_framework.response import Response
from rest_framework.views import APIView


class MyView(APIView):
    """Returns the logged-in user. Uses the global IsAuthenticated default."""

    def get(self, request):
        return Response({"username": request.user.get_username()})
