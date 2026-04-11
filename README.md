# SupplyLink

SupplyLink is a multi-tenant SaaS foundation for vendor-ledger, ordering,
invoicing, quotations, customer management, and delivery route planning. The
current step includes the auth foundation plus real vendor and customer
management endpoints for platform and vendor-level administration.

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
- `GET /api/v1/vendors/me`
- `PATCH /api/v1/vendors/me`
- `GET /api/v1/vendors/me/members`
- `GET /api/v1/vendors`
- `GET /api/v1/vendors/:vendorId`
- `PATCH /api/v1/vendors/:vendorId`
- `GET /api/v1/vendors/:vendorId/members`
- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/customers/:customerId`
- `PATCH /api/v1/customers/:customerId`

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

## Vendor Management

Module 3 replaces the placeholder vendor route with authenticated vendor
management endpoints. Vendor users are scoped through active
`vendor_memberships`; `super_admin` users can list and manage any vendor.

Vendor admins can inspect and update their own vendor profile:

```bash
curl http://localhost:4000/api/v1/vendors/me ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/vendors/me ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"displayName\":\"Acme Supply Co\",\"contactPhone\":\"+1-555-0100\"}"
```

Vendor admins can view their own member list:

```bash
curl http://localhost:4000/api/v1/vendors/me/members ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Super admins can list, inspect, update, and view members for any vendor:

```bash
curl "http://localhost:4000/api/v1/vendors?page=1&pageSize=20&search=acme&status=active" ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"

curl http://localhost:4000/api/v1/vendors/%VENDOR_ID% ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/vendors/%VENDOR_ID% ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"active\",\"slug\":\"acme-supply-co\"}"

curl http://localhost:4000/api/v1/vendors/%VENDOR_ID%/members ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
```

The current schema supports vendor profile fields such as legal/display name,
slug, status, contact email/phone, currency code, timezone, and timestamps.
Address fields are not present in the current vendor table yet, so this module
does not expose or migrate address data.

## Customer Management

Module 4 replaces the customer placeholder route with a vendor-isolated
customer management foundation. The `customers` table remains the shared master
record, while `vendor_customer_relationships` owns vendor-specific fields such
as account code, status, credit limit, price list code, notes, metadata, and
linked timestamps.

Vendor admins can create customers and update both clearly separated parts of
the payload:

```bash
curl -X POST http://localhost:4000/api/v1/customers ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customer\":{\"fullName\":\"Jane Buyer\",\"companyName\":\"Buyer Co\",\"email\":\"jane.buyer@example.com\",\"phone\":\"+1-555-0111\"},\"relationship\":{\"accountCode\":\"ACME-CUST-001\",\"status\":\"active\",\"creditLimit\":5000,\"priceListCode\":\"STANDARD\",\"notes\":\"Prefers morning deliveries\"}}"

curl -X PATCH http://localhost:4000/api/v1/customers/%CUSTOMER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customer\":{\"phone\":\"+1-555-0199\"},\"relationship\":{\"status\":\"inactive\",\"notes\":\"Paused ordering until next quarter\"}}"
```

Vendor admins and vendor staff can read only linked customers for their current
vendor:

```bash
curl "http://localhost:4000/api/v1/customers?page=1&pageSize=20&search=jane&status=active" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/customers/%CUSTOMER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Creation reuses an existing shared customer master when the email or phone
matches, then creates the vendor relationship. If the same vendor-customer pair
already exists, the API returns a conflict instead of creating a duplicate
relationship. `super_admin` can inspect a vendor-scoped customer view by using a
selected vendor context or passing `vendorId` as a query parameter.

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Foundation overview: `http://localhost:4000/api/v1/system/overview`
