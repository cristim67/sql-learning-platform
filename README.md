# Learn PostgreSQL

Fullstack app for learning PostgreSQL: Google auth, lessons, and a personal database (connection string stored encrypted).

## Structure

- **backend/** – Bun + Elysia + Prisma + PostgreSQL API
- **frontend/** – React + Vite

## Requirements

- [Bun](https://bun.sh)
- Node 18+ (for frontend, optional if using Bun everywhere)
- PostgreSQL (connection string in `.env`)
- Google Cloud: OAuth Client ID

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, GOOGLE_CLIENT_ID
# Generate keys: openssl rand -base64 32  (JWT), openssl rand -hex 32  (ENCRYPTION_KEY)

bun install
bun run db:generate
bun run db:migrate:dev    # first time: creates tables (migration)
bun run dev
```

Server: http://localhost:3001

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_GOOGLE_CLIENT_ID (same Client ID as backend)

bun install   # or npm install
bun run dev   # or npm run dev
```

App: http://localhost:5173

### 3. Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth 2.0 Client ID** (type: Web application).
3. Add to **Authorized JavaScript origins**: `http://localhost:5173` (and production domain).
4. Copy Client ID into `backend/.env` (GOOGLE_CLIENT_ID) and `frontend/.env` (VITE_GOOGLE_CLIENT_ID).

## Migrations

- Tables are **not** created automatically on startup; use Prisma migrations.
- First run: `bun run db:migrate:dev` (or `db:migrate` in production).
- Migrations live in `backend/prisma/migrations/`.

## API (backend)

- `POST /api/auth/google` – body: `{ "credential": "<google-id-token>" }` → returns JWT and user.
- `GET /api/auth/me` – Header: `Authorization: Bearer <token>` → current user.
- `GET /api/lessons` – list lessons + progress (auth).
- `GET /api/lessons/:slug` – lesson detail (auth).
- `POST /api/lessons/:slug/complete` – mark lesson as completed (auth).
- `GET /api/user-db` – check if user has a DB saved (auth).
- `POST /api/user-db` – body: `{ "connectionUrl": "..." }` – save URL encrypted (auth).
- `GET /api/user-db/decrypted` – return decrypted URL (server/backend only, auth).

## Security

- JWT for sessions; Google token is verified on the backend.
- User DB connection string is stored encrypted (AES-256-GCM) in the database.
- CORS limited to `FRONTEND_ORIGIN`.
- Sensitive values only in `.env`, never in code.

## Docker

Single env file: **server/.env** (copy from `server/.env.example`). Run from project root:

```bash
export $(grep -v '^#' server/.env | xargs) && docker compose up --build
```

- **App:** http://localhost (nginx serves the client and proxies `/api` to the server)
- **API:** http://localhost:3001

For Google OAuth when using Docker, add `http://localhost` to Authorized JavaScript origins in Google Cloud Console.

## User database

Users can configure their own PostgreSQL (e.g. via your create DB API). After they get the connection string, they can save it from Settings; it is stored encrypted. Decryption happens only on the server when needed (e.g. for future exercises).
