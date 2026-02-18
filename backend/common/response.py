from rest_framework import status as drf_status
from core import responses as core_responses


def ok(data=None, message="OK", meta=None, status=drf_status.HTTP_200_OK):
    return core_responses.api_success(message=message, data=data, meta=meta, status_code=status)


def created(data=None, message="Created", meta=None, status=drf_status.HTTP_201_CREATED):
    return core_responses.api_success(message=message, data=data, meta=meta, status_code=status)


def error(message="Error", errors=None, meta=None, status=drf_status.HTTP_400_BAD_REQUEST):
    resp = core_responses.api_error(message=message, errors=errors, status_code=status)
    if meta is not None:
        # Align with envelope shape
        resp.data["meta"] = meta
    return resp

