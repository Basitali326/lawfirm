import sys

from django.conf import settings
from django.db import connections


def _format_db_target(db_settings):
    engine = db_settings.get("ENGINE", "")
    name = db_settings.get("NAME", "")

    if engine.endswith("sqlite3"):
        return name

    host = db_settings.get("HOST") or "localhost"
    port = db_settings.get("PORT") or "default"
    return f"{host}:{port}/{name}"


def debug_default_db_connection(stream=None):
    stream = stream or sys.stdout
    db_settings = settings.DATABASES["default"]
    connection = connections["default"]
    target = _format_db_target(db_settings)

    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        print(f"[db] Connected: {target}", file=stream)
        return True
    except Exception as exc:
        print(f"[db] Connection failed: {target}", file=stream)
        print(f"[db] {exc.__class__.__name__}: {exc}", file=stream)
        return False
    finally:
        connection.close()
