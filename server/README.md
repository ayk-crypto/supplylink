# Server

Express API for SupplyLink with a modular multi-tenant foundation.

## Highlights

- versioned routing through `/api/v1`
- shared success/error response envelope
- request and tenant context middleware
- Zod-based validation middleware
- JWT auth with bcrypt password hashing
- role and vendor-membership foundations
- PostgreSQL migration runner with foundational schema
- placeholder domain modules for future SaaS features

## Environment Files

- Use `.env.development` for local development
- Use `.env.production` for production deployments
- If `NODE_ENV` is not set, the server defaults to `development`
- `DATABASE_URL` is only required for database-backed work such as migrations or DB health checks

## Key Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/system/health`
- `GET /api/v1/system/overview`
- `GET /api/v1/system/modules`

## Database

- Migration files live in [server/src/database/migrations/001_initial_foundation.sql](/d:/supplylink/server/src/database/migrations/001_initial_foundation.sql)
- Auth and membership extension lives in [server/src/database/migrations/002_auth_and_vendor_memberships.sql](/d:/supplylink/server/src/database/migrations/002_auth_and_vendor_memberships.sql)
- Run `npm run db:migrate` inside the `server` workspace after setting `DATABASE_URL`

## Auth Notes

- Access tokens are bearer JWTs signed with `JWT_SECRET`
- Passwords are hashed with bcrypt before storage
- Vendor team membership is modeled in `vendor_memberships`
- Vendor roles remain tenant-aware through `user_roles.vendor_id` plus membership records
