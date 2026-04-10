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
