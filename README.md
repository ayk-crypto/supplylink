# SupplyLink

SupplyLink is a multi-tenant SaaS foundation for vendor-ledger, ordering,
invoicing, quotations, customer management, and delivery route planning. The
current step focuses on architecture, shared conventions, and database
groundwork rather than implementing business workflows.

## Structure

```text
.
|-- client/   # React app powered by Vite
|-- server/   # Express API with modular versioned routes and DB migrations
|-- docs/     # Project notes and planning
`-- package.json
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment files:

   ```bash
   copy server\.env.example server\.env.development
   copy client\.env.example client\.env.development
   ```

3. Start the client and server together:

   ```bash
   npm run dev
   ```

4. If PostgreSQL is configured, apply the schema foundation:

   ```bash
   npm run db:migrate --workspace server
   ```

## Scripts

- `npm run dev` starts both workspaces in development mode.
- `npm run build` validates the server build step and builds the frontend.
- `npm run lint` runs ESLint in both workspaces.
- `npm run start` starts the Express server in production mode.
- `npm run db:migrate --workspace server` applies SQL migrations.

## Architecture

The backend is organized around a versioned API entrypoint at `/api/v1`.
Domain modules are split into `auth`, `vendors`, `customers`, `products`,
`orders`, `invoices`, `quotations`, `ledger`, `routes`, and `subscriptions`,
with lightweight placeholders ready for future services, controllers, and
validators.

Shared backend patterns now include:

- centralized environment config in [server/src/config/env.js](/d:/supplylink/server/src/config/env.js)
- request context and tenant context middleware
- a consistent API envelope for success and error responses
- reusable validation with Zod
- a role foundation for platform and vendor scopes
- SQL migrations for the initial multi-tenant schema
- JWT auth, bcrypt password hashing, and role-aware guards

The tenancy model is designed so a `customer` can exist once while the
`vendor_customer_relationships` table keeps each vendor-customer association
isolated. That lets multiple vendors work with the same real-world customer
without leaking ledger, order, pricing, or route data across tenants.

## Key Endpoints

- `GET /api/v1/system/health`
- `GET /api/v1/system/overview`
- `GET /api/v1/system/modules`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## Auth Foundation

Authentication is JWT-based and stateless. Passwords are hashed with bcrypt,
access tokens are signed with `JWT_SECRET`, and `/api/v1/auth/me` uses bearer
token auth to return the current authenticated user.

The role foundation currently supports:

- `super_admin`
- `vendor_admin`
- `vendor_staff`
- `customer_user`

Registration rules in this foundation:

- the first `super_admin` can be bootstrapped without an existing auth session
- unauthenticated `vendor_admin` registration must create a brand-new vendor
- `vendor_staff` creation requires an authenticated `vendor_admin` for that vendor or a `super_admin`
- `customer_user` is prepared for future portal access and is admin-created for now

To test quickly after migrations:

```bash
curl -X POST http://localhost:4000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"fullName\":\"Vendor Admin\",\"email\":\"owner@example.com\",\"password\":\"Password123!\",\"roleCode\":\"vendor_admin\",\"vendor\":{\"legalName\":\"Acme Supplies LLC\",\"displayName\":\"Acme Supplies\",\"slug\":\"acme-supplies\"}}"
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Foundation overview: `http://localhost:4000/api/v1/system/overview`
