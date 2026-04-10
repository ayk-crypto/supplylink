# Server

Express API for SupplyLink with PostgreSQL-ready infrastructure.

## Highlights

- Centralized environment config
- Modular routes, controllers, and middleware
- `pg` pool setup for PostgreSQL
- Health and status endpoints for local integration

## Environment Files

- Use `.env.development` for local development
- Use `.env.production` for production deployments
- If `NODE_ENV` is not set, the server defaults to `development`
- `PORT` and `DATABASE_URL` are required and validated on startup
- Neon works in development through `server/.env.development` using the same `DATABASE_URL` flow as production

## Health Checks

- `GET /api/health` confirms the API is running
- `GET /api/health/database` confirms PostgreSQL connectivity
