from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotAuthenticated, PermissionDenied, NotFound


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return Response(
            {"error": {"message": "Server error", "code": "SERVER_ERROR"}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Default message and code
    message = "Error"
    code = None
    details = response.data

    if isinstance(exc, ValidationError):
        message = "Validation error"
        code = "VALIDATION_ERROR"
    elif isinstance(exc, NotAuthenticated):
        message = "Authentication failed"
        code = "AUTH_ERROR"
    elif isinstance(exc, PermissionDenied):
        message = "Permission denied"
        code = "PERMISSION_DENIED"
    elif isinstance(exc, NotFound):
        message = "Not found"
        code = "NOT_FOUND"
    else:
        message = str(exc) or "Server error"
        code = "SERVER_ERROR"

    response.data = {"error": {"message": message, "code": code, "details": details}}
    return response
