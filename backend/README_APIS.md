# API Reference

Base URL: `http://localhost:8000`

## Auth
- **POST** `/api/authx/register-firm/`  
  Body: `{"firm_name","first_name","last_name","email","password","password2"}`
- **POST** `/api/authx/login/`  
  Body: `{"email","password"}`
- **POST** `/api/authx/logout/`
- **POST** `/api/authx/token/refresh/`  
  Reads refresh cookie; accepts `{}`.
- **GET** `/api/authx/me/`  
  Returns current user + firm.

## Firms
- **GET/PATCH** `/api/firms/profile/`  
  Authenticated firm owner profile.

## Cases (multi-tenant, wrapped responses)
Base: `/api/v1/cases/`
- **GET** `/api/v1/cases/`  
  Query params:  
  `page` (default 1), `page_size` (default 20, max 100),  
  `search` (title, case_number),  
  `status`, `priority`, `case_type`, `assigned_lead`, `client`,  
  `date_from`, `date_to`, `sort` (created_at, open_date, title; prefix `-` for desc).
- **POST** `/api/v1/cases/`  
  Body: `title` (required), `case_type`, `case_number` (optional, auto-generated if omitted),  
  `status` (OPEN/HOLD/CLOSED, default OPEN),  
  `priority` (LOW/MEDIUM/HIGH/URGENT, default MEDIUM),  
  `description`, `court_name`, `judge_name`, `open_date` (default today),  
  `close_date`, `close_reason`, `client`, `assigned_lead`.
- **GET** `/api/v1/cases/{id}/`
- **PATCH** `/api/v1/cases/{id}/` (same fields as POST)
- **DELETE** `/api/v1/cases/{id}/` (soft delete: sets `is_deleted`, `deleted_at`)

### Permissions
- SUPER_ADMIN: full access; may target any firm via header `X-FIRM-ID: <firm_uuid>`.
- FIRM_OWNER/OWNER: CRUD within their firm.
- CLIENT: read-only, only cases where `case.client.user == request.user`.

### Response envelope (all endpoints)
```json
{
  "success": true|false,
  "message": "string",
  "data": {...}|null,
  "errors": {...}|null,
  "meta": {...}|null
}
```

### Notes
- Firm is derived from `request.user` unless SUPER_ADMIN uses `X-FIRM-ID`.
- Case numbers auto-increment per firm when omitted.
- DELETE is soft; cases filtered by `is_deleted=false`.
- Unique constraint: (`firm`, `case_number`) when `case_number` is non-blank.

## Seeder
- `python manage.py seed_defaults`  
  Creates SUPER_ADMIN (env `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`; defaults admin@admin.com / Admin@12345!).  
  Creates demo Firm + FIRM_OWNER (env `DEMO_FIRM_*`).  
  Creates demo CLIENT + ClientProfile (env `DEMO_CLIENT_*`). 
