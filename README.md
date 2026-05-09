# SQL Learning Platform 🎓

A full-stack educational platform for learning SQL (PostgreSQL), developed as a technical master's thesis project. The platform allows users to complete interactive lessons, configure their own databases, and track their progress in a secure environment.

## 🚀 Key Features

- **Google OAuth 2.0 Authentication**: Secure integration for quick access.
- **Interactive Lesson System**: Lesson catalog with automatic progress saving.
- **User Data Isolation**: Each user configures their own PostgreSQL database (via Genezio/Docker/External).
- **Advanced Security**: Connection strings (URLs) are stored encrypted (AES-256-GCM) in the main database.
- **Modern Architecture**:
  - **Backend**: Bun + ElysiaJS + Prisma ORM.
  - **Frontend**: React + Vite + TailwindCSS.

## 📂 Project Structure

- `server/` – Backend API (TypeScript, Elysia, Prisma).
- `client/` – Frontend application (React).
- `report/` – Detailed technical report (LaTeX).
- `demo/` – Video recording showcasing the platform's functionality.

## 🛠️ Requirements

- [Bun Runtime](https://bun.sh) (recommended) or Node.js 18+.
- PostgreSQL (for the central database).
- Google Cloud account (for OAuth Client ID).

## ⚙️ Setup and Run

### 1. Backend (Server)

```bash
cd server
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, GOOGLE_CLIENT_ID

bun install
bun run db:generate
bun run db:migrate:dev    # Creates initial tables
bun run dev
```

### 2. Frontend (Client)

```bash
cd client
cp .env.example .env
# Edit .env: VITE_GOOGLE_CLIENT_ID (same as server)

bun install
bun run dev
```

---

## 🐳 Run with Docker (Recommended)

The platform includes a complete `docker-compose` configuration that starts both the client (served via Nginx) and the server.

1. Ensure you have a valid `.env` file in the `server/` folder.
2. From the project root, run:

```bash
docker-compose up --build
```

- **Application**: [http://localhost](http://localhost) (Nginx proxies `/api` to the server).
- **Backend API**: [http://localhost:3001](http://localhost:3001).

---

## 📄 Technical Documentation

For in-depth details about the database architecture, Prisma modeling, security flows, and design decisions, refer to the technical report in `report/main.pdf`.

---

## 🎥 Demo

A video demonstration of the platform (authentication, lesson setup, script execution) can be found in the `demo/` folder.
