Backend setup (Django + DRF + JWT)
=================================

Prereqs
- Python 3.11+
- pip

1) Create virtual environment
   macOS/Linux:  python -m venv .venv && source .venv/bin/activate
   Windows PS:   python -m venv .venv ; .\.venv\Scripts\Activate.ps1

2) Install requirements
   pip install -r requirements.txt

3) Configure settings module
   macOS/Linux:  export DJANGO_SETTINGS_MODULE=config.settings.local
   Windows PS:   $env:DJANGO_SETTINGS_MODULE="config.settings.local"

4) Environment file
   cp .env.example .env
   # adjust values as needed (DATABASE_URL, secrets, origins)

5) Run migrations
   python manage.py migrate

6) Run development server
   python manage.py runserver

Docs & schema
- Open Swagger UI at http://127.0.0.1:8000/api/docs/
- Open OpenAPI schema at http://127.0.0.1:8000/api/schema/

Production
- Set DJANGO_SETTINGS_MODULE=config.settings.production
- Provide strong DJANGO_SECRET_KEY
- Set ALLOWED_HOSTS and DATABASE_URL (e.g., postgres://USER:PASSWORD@HOST:5432/DB)

Switching to Postgres later
- Update DATABASE_URL in .env to your postgres URL
- pip install -r requirements.txt (psycopg[binary] already included)
- Run python manage.py migrate

CORS for Next.js
- Defaults allow http://localhost:3000 and http://127.0.0.1:3000
- Edit CORS_ALLOWED_ORIGINS in .env if frontend host changes
