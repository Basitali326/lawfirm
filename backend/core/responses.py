from rest_framework.response import Response
from rest_framework import status as drf_status


def api_success(*args, message="OK", data=None, meta=None, status_code=drf_status.HTTP_200_OK):
    if len(args) > 1:
        raise TypeError("api_success() accepts at most one positional argument")

    # Backward-compatible handling:
    # - `api_success("Created", data=...)` keeps working.
    # - `api_success("OK", data=..., message="Invoice created")` prefers the explicit keyword.
    if args and message == "OK":
        message = args[0]

    return Response(
        {
            "success": True,
            "message": message,
            "data": data,
            "errors": None,
            "meta": meta,
        },
        status=status_code,
    )


def api_error(message="Error", errors=None, status_code=drf_status.HTTP_400_BAD_REQUEST, **kwargs):
    return Response(
        {
            "success": False,
            "message": message,
            "data": None,
            "errors": errors if errors is not None else None,
            "meta": None,
        },
        status=status_code,
    )
