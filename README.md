# WebChat Stack

Full-stack real-time chat application built with Django, Django REST Framework, Django Channels, and a React frontend bundled with Webpack.

## Prerequisites

- Python 3.8 or higher (Python 3.13 tested locally)
- PostgreSQL 13+ running locally or reachable remotely
- Node.js 16+ and npm 8+
- Redis (optional; only needed when switching the channel layer from in-memory to Redis)
- Recommended: a Python virtual environment and separate terminal tabs for backend/frontend processes

## Backend Setup (Django)

1. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
2. Install Python dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```
3. Configure PostgreSQL connection (adjust values to match your setup):
   ```powershell
   $Env:POSTGRES_DB = "webchat"
   $Env:POSTGRES_USER = "postgres"
   $Env:POSTGRES_PASSWORD = "postgres"
   $Env:POSTGRES_HOST = "127.0.0.1"
   $Env:POSTGRES_PORT = "5432"
   ```
   The defaults above match the fallback values in `chatserver/settings.py`. Create the database manually if it does not exist:
   ```powershell
   createdb webchat  # requires PostgreSQL tools in PATH
   ```
4. Apply migrations and create a superuser if desired:
   ```powershell
   python backend/manage.py makemigrations
   python backend/manage.py migrate
   python backend/manage.py createsuperuser  # optional but useful for admin login
   ```
5. Start the ASGI server with Daphne (ensures WebSocket support):
   ```powershell
   cd backend
   daphne -p 8000 chatserver.asgi:application
   ```
   Django's `runserver` (`python manage.py runserver`) also works for local development because the project is ASGI-ready, but Daphne mirrors production behaviour more closely.

### Important backend settings

- `CHANNEL_LAYERS` defaults to the in-memory layer; switch to Redis for multi-instance deployments by updating `chatserver/settings.py`.
- `CORS_ALLOWED_ORIGINS` currently allows `http://localhost:3000`. Adjust or extend for additional frontend origins.
- Media uploads (avatar pictures) are stored in `backend/media/`. Ensure the directory exists and is writable.

## Frontend Setup (React)

1. Install dependencies:
   ```powershell
   cd chatfrontend
   npm install
   ```
2. Start the development server:
   ```powershell
   npm start
   ```
   The Webpack dev server runs on `http://localhost:3000`, proxies REST calls to `http://localhost:8000`, and forwards WebSocket traffic to `ws://localhost:8000`.
3. Optional environment configuration:
   - `REACT_APP_API_BASE`: override the REST base URL (defaults to same-origin/proxied `/api`).
   - `REACT_APP_WS_BASE`: override the WebSocket base URL used by the client (defaults to `ws(s)://<host>` at runtime).
   Set these in a `.env` file in `chatfrontend/` when building for deployment.
4. Build for production:
   ```powershell
   npm run build
   ```
   Outputs `dist/`, which can be served by any static file host or collected by Django (copy to `backend/static/` or configure WhiteNoise).

## Running the stack

1. Start the Django backend (Daphne or `runserver`).
2. Start the React dev server (`npm start`).
3. Visit `http://localhost:3000`:
   - Register a user (the frontend calls `POST /api/auth/register/`).
   - Log in with the same credentials (session-based auth).
   - Create chats and exchange messages in real time.
   - Use the "Start a new chat" form in the React sidebar to begin a conversation with any existing username.

Use two browser windows or private/incognito sessions to simulate different users joining the same chat (`/ws/chat/<chat_id>/`).

## Testing & Tooling

- Django tests: `python backend/manage.py test`.
- Frontend linting/tests are not included; integrate ESLint, Jest, or Vitest as needed.

## Deployment notes

- Switch `CHANNEL_LAYERS` to Redis (`channels_redis.core.RedisChannelLayer`) and configure the Redis host.
- Serve Django using Daphne/Uvicorn behind a production-grade HTTP proxy (Nginx, Caddy) that supports WebSocket upgrades.
- Build the React frontend (`npm run build`) and serve the static files via a CDN or Django's static handling.
- Set `DJANGO_DEBUG=False`, configure `ALLOWED_HOSTS`, and supply secret settings via environment variables.
- For HTTPS, ensure WebSocket endpoints use `wss://` and your reverse proxy forwards WebSocket upgrade headers.

Happy hacking!


## Docker (no local installs)

Prerequisites:
- Docker Desktop (or Docker Engine) installed and running.

Quick start:

```powershell
# from the project root
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API and admin: http://localhost:8000 (admin at /admin when a superuser exists)
- Postgres runs in a container; the backend runs migrations automatically on start.

Notes:
- The frontend dev server proxies API, media and WebSocket traffic to the backend service inside the compose network. No local Node/Python is required on the host.
- To stop: `docker compose down` (add `-v` to remove the Postgres volume).
- To create a Django superuser inside the running backend container: `docker compose exec backend python manage.py createsuperuser`
