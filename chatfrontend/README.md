# Frontend (React + Webpack)

This directory contains the React frontend bundled with Webpack.
See the repository root `README.md` for the full-stack flow.

## Scripts

```bash
npm start   # start webpack-dev-server at http://localhost:3000
npm run build  # production build to dist/
```

## Environment

- Copy `.env.example` to `.env` to customize the backend origin used by the dev server:

```env
BACKEND_ORIGIN=http://localhost:8000
```

The dev server proxies REST and WebSocket traffic to `BACKEND_ORIGIN`.
