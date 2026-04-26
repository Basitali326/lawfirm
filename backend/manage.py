#!/usr/bin/env python
import os
import sys


def maybe_debug_database_connection():
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    should_probe = command in {"runserver", "daphne"} and (
        "--noreload" in sys.argv or os.environ.get("RUN_MAIN") == "true"
    )

    if not should_probe:
        return

    import django
    from django.conf import settings

    django.setup()

    if not getattr(settings, "DB_DEBUG_ON_STARTUP", True):
        return

    from core.db_debug import debug_default_db_connection

    debug_default_db_connection(stream=sys.stdout)


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and available on your PYTHONPATH environment variable? Did you forget to activate a virtual environment?"
        ) from exc
    maybe_debug_database_connection()
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
