# Chat Backend

Minimal Node.js backend with Redis and Postgres.

## Setup

1. Copy `.env.example` to `.env`.
2. Start infrastructure with `docker compose up -d`.
3. Install dependencies with `npm install`.
4. Start the API with `npm run dev`.

## Docker connection values

If the backend runs on your machine:

- `POSTGRES_HOST=localhost`
- `REDIS_HOST=localhost`
- `REDIS_URL=redis://localhost:6379`

If the backend also runs in Docker Compose:

- `POSTGRES_HOST=postgres`
- `REDIS_HOST=redis`
- `REDIS_URL=redis://redis:6379`

## Endpoints

- `GET /`
- `GET /health`
# Pulse--Backend
