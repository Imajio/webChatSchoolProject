# Backend (Django + DRF + Channels)

This directory contains the Django project (`chatserver`) and the `chat` app.
See the repository root `README.md` for full-stack instructions. Below are
backend-only quick commands.

## Quickstart

```powershell
# create venv (Windows PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# set env (adjust as needed)
$Env:POSTGRES_DB = "webchat"
$Env:POSTGRES_USER = "postgres"
$Env:POSTGRES_PASSWORD = "postgres"
$Env:POSTGRES_HOST = "127.0.0.1"
$Env:POSTGRES_PORT = "5432"

# migrate and run (ASGI ready)
python manage.py migrate
python manage.py runserver 8000
# or use Daphne for closer-to-prod ASGI
# daphne -p 8000 chatserver.asgi:application
```

## Management

- Migrations: `python manage.py makemigrations && python manage.py migrate`
- Superuser: `python manage.py createsuperuser`
- Tests: `python manage.py test`
- Lint/format: integrate tools of choice (e.g., ruff, black) if desired

## Environment

Copy `.env.example` to `.env` and adjust values when running without Docker.
`settings.py` reads PostgreSQL and Django settings from environment variables.
