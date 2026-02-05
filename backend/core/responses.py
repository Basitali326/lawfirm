from rest_framework.response import Response
from rest_framework import status as drf_status


def api_success(message="OK", data=None, meta=None, status_code=drf_status.HTTP_200_OK):
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


def api_error(message="Error", errors=None, status_code=drf_status.HTTP_400_BAD_REQUEST):
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
