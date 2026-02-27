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

Email delivery
- Dev: default console backend prints emails to the terminal.
- Prod: set EMAIL_BACKEND to an SMTP backend and configure EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS.

Document uploads (local now, S3-ready later)
- Files are stored under MEDIA_ROOT (default: backend/media).
- Nginx should serve /media/ from MEDIA_ROOT in production.
- Key env vars:
  - STORAGE_BACKEND=local
  - MEDIA_ROOT=/var/www/lawfirm/media
  - DOCUMENT_MAX_SIZE_MB=5
  - DOCUMENT_ALLOWED_EXTENSIONS=pdf,jpg,jpeg,png,doc,docx,ppt,pptx
- To switch to S3 later, set STORAGE_BACKEND=s3 and DEFAULT_FILE_STORAGE to your S3 backend.
