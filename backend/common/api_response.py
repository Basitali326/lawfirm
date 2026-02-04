from rest_framework.response import Response


def api_success(data=None, status=200, meta=None):
    payload = {"data": data}
    if meta is not None:
        payload["meta"] = meta
    return Response(payload, status=status)


def api_error(message, status=400, code=None, details=None):
    error = {"message": message}
    if code:
        error["code"] = code
    if details is not None:
        error["details"] = details
    return Response({"error": error}, status=status)
