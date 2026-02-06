from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.exceptions import ValidationError, NotAuthenticated, PermissionDenied, NotFound
from core.responses import api_error


def custom_exception_handler(exc, context):
    if isinstance(exc, ValidationError):
        return api_error("Validation error", errors=exc.detail, status_code=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, NotAuthenticated):
        return api_error("Authentication credentials were not provided.", status_code=status.HTTP_401_UNAUTHORIZED)
    if isinstance(exc, PermissionDenied):
        return api_error("Forbidden", status_code=status.HTTP_403_FORBIDDEN)
    if isinstance(exc, NotFound):
        return api_error("Not found", status_code=status.HTTP_404_NOT_FOUND)

    response = exception_handler(exc, context)
    if response is not None:
        return api_error(str(exc) or "Server error", errors=response.data, status_code=response.status_code)
    return api_error("Server error", errors={"detail": str(exc)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
