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

   If you want to enable quotation/invoice email sending locally, also configure SMTP values in
   `server\.env.development` such as `EMAIL_SMTP_HOST`, `EMAIL_SMTP_PORT`, and `EMAIL_FROM_ADDRESS`.
   If SMTP is not configured, document email actions stay optional and the UI falls back to secure
   share-link guidance instead of breaking the document workflow.

3. Apply migrations and seed a demo dataset:

   ```bash
   npm run db:bootstrap
   ```

4. Start the client and server together:

   ```bash
   npm run dev
   ```

If you prefer separate steps, run migrations and seed independently:

```bash
npm run db:migrate
npm run db:seed
```

## Scripts

- `npm run dev` starts both workspaces in development mode.
- `npm run build` validates the server build step and builds the frontend.
- `npm run lint` runs ESLint in both workspaces.
- `npm run test` runs the server's built-in Node test suite.
- `npm run test:integration` runs DB-backed server integration tests when `TEST_DATABASE_URL` is configured.
- `npm run start` starts the Express server in production mode.
- `npm run db:migrate --workspace server` applies SQL migrations.
- `npm run db:seed` creates a small local/demo dataset.
- `npm run db:bootstrap` runs migrations and then seeds demo data.

## Architecture

The backend is organized around a versioned API entrypoint at `/api/v1`.
Domain modules are split into `auth`, `vendors`, `customers`, `products`,
`orders`, `invoices`, `quotations`, `ledger`, `routes`, `subscriptions`,
`notifications`, and `files`, with lightweight placeholders ready for future
services, controllers, and validators.

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
- `GET /api/v1/system/readiness`
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
- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `GET /api/v1/categories/:categoryId`
- `PATCH /api/v1/categories/:categoryId`
- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/:productId`
- `PATCH /api/v1/products/:productId`
- `GET /api/v1/quotations`
- `POST /api/v1/quotations`
- `GET /api/v1/quotations/:quotationId`
- `GET /api/v1/quotations/:quotationId/print`
- `PATCH /api/v1/quotations/:quotationId`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:orderId`
- `PATCH /api/v1/orders/:orderId`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:invoiceId`
- `GET /api/v1/invoices/:invoiceId/print`
- `PATCH /api/v1/invoices/:invoiceId`
- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `GET /api/v1/payments/:paymentId`
- `PATCH /api/v1/payments/:paymentId`
- `GET /api/v1/ledger`
- `GET /api/v1/ledger/customer/:customerId`
- `GET /api/v1/routes`
- `POST /api/v1/routes`
- `GET /api/v1/routes/:routeId`
- `PATCH /api/v1/routes/:routeId`
- `GET /api/v1/routes/:routeId/stops`
- `POST /api/v1/routes/:routeId/stops`
- `PATCH /api/v1/routes/:routeId/stops/:stopId`
- `GET /api/v1/subscriptions`
- `POST /api/v1/subscriptions`
- `GET /api/v1/subscriptions/me`
- `GET /api/v1/subscriptions/:subscriptionId`
- `PATCH /api/v1/subscriptions/:subscriptionId`
- `GET /api/v1/subscriptions/admin/vendors/:vendorId/overview`
- `PATCH /api/v1/subscriptions/admin/vendors/:vendorId/status`
- `GET /api/v1/reports/summary`
- `GET /api/v1/reports/orders`
- `GET /api/v1/reports/invoices`
- `GET /api/v1/reports/payments`
- `GET /api/v1/reports/customer-statement/:customerId`
- `GET /api/v1/reports/exports/orders.csv`
- `GET /api/v1/reports/exports/invoices.csv`
- `GET /api/v1/reports/exports/payments.csv`
- `GET /api/v1/reports/exports/customer-statement/:customerId.csv`
- `GET /api/v1/reports/admin/overview`
- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/:notificationId`
- `PATCH /api/v1/notifications/:notificationId/read`
- `PATCH /api/v1/notifications/read-all`
- `GET /api/v1/files`
- `POST /api/v1/files`
- `GET /api/v1/files/:fileId`
- `GET /api/v1/files/:fileId/download`
- `GET /api/v1/files/entity/:entityType/:entityId`
- `DELETE /api/v1/files/:fileId`
- `GET /api/v1/lookups/customers`
- `GET /api/v1/lookups/products`
- `GET /api/v1/lookups/categories`
- `GET /api/v1/lookups/vendors`
- `GET /api/v1/lookups/options`
- `GET /api/v1/ui/dashboard`
- `GET /api/v1/ui/create-context`
- `GET /api/v1/ui/notifications-panel`

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

## Catalog And Categories

Module 5 replaces the product placeholder route with a vendor-scoped catalog
foundation and adds `/api/v1/categories`. Categories use the existing
`categories` table, and products use the existing `products` table.

Vendor admins can create and update catalog records:

```bash
curl -X POST http://localhost:4000/api/v1/categories ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Beverages\",\"description\":\"Shelf-stable drinks\"}"

curl -X POST http://localhost:4000/api/v1/products ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sku\":\"BEV-001\",\"name\":\"Sparkling Water 12 Pack\",\"description\":\"Lime sparkling water case\",\"categoryId\":\"%CATEGORY_ID%\",\"unitPrice\":8.99,\"status\":\"active\",\"metadata\":{\"unit\":\"case\"}}"

curl -X PATCH http://localhost:4000/api/v1/products/%PRODUCT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"unitPrice\":9.49,\"status\":\"active\",\"metadata\":{\"unit\":\"case\",\"cost\":6.25}}"
```

Vendor admins and vendor staff can read only their current vendor catalog:

```bash
curl "http://localhost:4000/api/v1/categories?page=1&pageSize=20&search=bev" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/products?page=1&pageSize=20&status=active&categoryId=%CATEGORY_ID%&search=water" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/products/%PRODUCT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

The existing schema enforces vendor-local category slug uniqueness and
vendor-local product SKU uniqueness. No migration was added because the current
tables already support the foundation fields; category status and first-class
product unit, cost, and currency columns can be introduced later when pricing
and inventory requirements become clearer.

## Quotations

Module 6 replaces the quotation placeholder with vendor-scoped quotation
management. Quotations use the existing `quotations` table, and line items use
the new `quotation_items` table. Customers must already be linked to the vendor,
and every quoted product must belong to the same vendor.

Vendor admins can create and update draft or sent quotations:

```bash
curl -X POST http://localhost:4000/api/v1/quotations ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"issueDate\":\"2026-04-11\",\"expiryDate\":\"2026-04-25\",\"notes\":\"Introductory quote\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":2,\"unitPrice\":8.99,\"discount\":1,\"tax\":0.5}]}"

curl -X PATCH http://localhost:4000/api/v1/quotations/%QUOTATION_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"sent\",\"notes\":\"Sent to customer\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":3,\"unitPrice\":8.99,\"discountTotal\":0,\"taxTotal\":0.75}]}"
```

Vendor admins and vendor staff can read only their current vendor quotations:

```bash
curl "http://localhost:4000/api/v1/quotations?page=1&pageSize=20&status=draft&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/quotations/%QUOTATION_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

The API calculates subtotal, discount total, tax total, grand total, and line
totals on the server. Quote numbers are unique per vendor; if omitted, the API
generates a quote number. `accepted`, `rejected`, and `expired` quotations are
treated as finalized and cannot be patched.

## Orders

Module 7 replaces the order placeholder with vendor-scoped order management.
Orders use the existing `orders` table, and line items use the existing
`order_items` table extended with sequence, description, and metadata support.
Customers must already be linked to the vendor, and every ordered product must
belong to the same vendor.

Vendor admins can create direct orders:

```bash
curl -X POST http://localhost:4000/api/v1/orders ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"orderDate\":\"2026-04-11\",\"requestedDeliveryDate\":\"2026-04-18\",\"notes\":\"Manual order\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":2,\"unitPrice\":8.99,\"discount\":1,\"tax\":0.5}]}"
```

Vendor admins can also create an order from a same-vendor quotation:

```bash
curl -X POST http://localhost:4000/api/v1/orders ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"quotationId\":\"%QUOTATION_ID%\",\"orderDate\":\"2026-04-11\",\"requestedDeliveryDate\":\"2026-04-18\",\"status\":\"confirmed\"}"
```

Vendor admins and vendor staff can read only their current vendor orders:

```bash
curl "http://localhost:4000/api/v1/orders?page=1&pageSize=20&status=draft&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Vendor admins can update non-terminal orders:

```bash
curl -X PATCH http://localhost:4000/api/v1/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"confirmed\",\"notes\":\"Confirmed with customer\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":3,\"unitPrice\":8.99,\"discountTotal\":0,\"taxTotal\":0.75}]}"
```

The API calculates subtotal, discount total, tax total, grand total, and line
totals on the server. Order numbers are unique per vendor; if omitted, the API
generates an order number. `delivered` and `cancelled` orders are terminal, and
line items can only be replaced while an order is `draft` or `confirmed`.

## Invoices

Module 8 replaces the invoice placeholder with vendor-scoped invoice
management. Invoices use the existing `invoices` table, and line items use the
new `invoice_items` table. Customers must already be linked to the vendor, and
every invoiced product must belong to the same vendor.

Vendor admins can create direct invoices:

```bash
curl -X POST http://localhost:4000/api/v1/invoices ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"issueDate\":\"2026-04-11\",\"dueDate\":\"2026-04-25\",\"notes\":\"Manual invoice\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":2,\"unitPrice\":8.99,\"discount\":1,\"tax\":0.5}]}"
```

Vendor admins can also create an invoice from a same-vendor order:

```bash
curl -X POST http://localhost:4000/api/v1/invoices ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"issueDate\":\"2026-04-11\",\"dueDate\":\"2026-04-25\",\"status\":\"issued\"}"
```

Vendor admins and vendor staff can read only their current vendor invoices:

```bash
curl "http://localhost:4000/api/v1/invoices?page=1&pageSize=20&status=draft&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/invoices/%INVOICE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Vendor admins can update non-terminal invoices:

```bash
curl -X PATCH http://localhost:4000/api/v1/invoices/%INVOICE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"issued\",\"notes\":\"Issued to customer\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":3,\"unitPrice\":8.99,\"discountTotal\":0,\"taxTotal\":0.75}]}"
```

The API calculates subtotal, discount total, tax total, grand total, balance
due, and line totals on the server. Invoice numbers are unique per vendor; if
omitted, the API generates an invoice number. `paid` and `void` invoices are
terminal, and line items can only be replaced while an invoice is `draft`.

## Ledger And Payments

Module 9 replaces the ledger placeholder with vendor-scoped payment and ledger
history endpoints. Invoice-linked payments update invoice balance due and
status, while on-account payments can be recorded without an invoice.

Vendor admins can create invoice-linked payments:

```bash
curl -X POST http://localhost:4000/api/v1/payments ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"invoiceId\":\"%INVOICE_ID%\",\"paymentDate\":\"2026-04-12\",\"amount\":25.50,\"paymentMethod\":\"bank_transfer\",\"referenceNumber\":\"PAY-1001\",\"notes\":\"Partial payment\"}"
```

Vendor admins can also record on-account payments:

```bash
curl -X POST http://localhost:4000/api/v1/payments ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"paymentDate\":\"2026-04-12\",\"amount\":10,\"paymentMethod\":\"cash\",\"referenceNumber\":\"ADV-1001\",\"notes\":\"On-account payment\"}"
```

Vendor admins and vendor staff can read payments and ledger entries for their
current vendor:

```bash
curl "http://localhost:4000/api/v1/payments?page=1&pageSize=20&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/payments/%PAYMENT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/ledger?page=1&pageSize=20&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/ledger/customer/%CUSTOMER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Payments are financially immutable after creation: amount, customer, and invoice
linkage are not editable. Vendor admins can adjust reference, method, notes, and
metadata:

```bash
curl -X PATCH http://localhost:4000/api/v1/payments/%PAYMENT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"referenceNumber\":\"PAY-1001-UPDATED\",\"notes\":\"Updated bank reference\"}"
```

## Route Planning

Module 10 replaces the route placeholder with vendor-scoped route planning and
ordered route stops. Stops can reference customers and optionally same-vendor
orders; order workflow is left untouched for now.

Vendor admins can create and update routes:

```bash
curl -X POST http://localhost:4000/api/v1/routes ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"North Loop\",\"routeDate\":\"2026-04-13\",\"status\":\"planned\",\"vehicleLabel\":\"Van 12\",\"notes\":\"Morning deliveries\"}"

curl -X PATCH http://localhost:4000/api/v1/routes/%ROUTE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"in_progress\",\"vehicleLabel\":\"Van 14\"}"
```

Vendor admins and vendor staff can read current-vendor routes:

```bash
curl "http://localhost:4000/api/v1/routes?page=1&pageSize=20&status=planned&routeDate=2026-04-13" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/routes/%ROUTE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Vendor admins can add and reorder route stops:

```bash
curl -X POST http://localhost:4000/api/v1/routes/%ROUTE_ID%/stops ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sequenceNumber\":1,\"customerId\":\"%CUSTOMER_ID%\",\"orderId\":\"%ORDER_ID%\",\"stopType\":\"delivery\",\"plannedArrivalAt\":\"2026-04-13T09:00:00+05:00\",\"notes\":\"Call on arrival\"}"

curl http://localhost:4000/api/v1/routes/%ROUTE_ID%/stops ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/routes/%ROUTE_ID%/stops/%STOP_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sequenceNumber\":2,\"status\":\"completed\",\"actualArrivalAt\":\"2026-04-13T09:12:00+05:00\"}"
```

Stop sequencing uses explicit `sequenceNumber` values and shifts neighboring
stops when a new stop is inserted or an existing stop is moved.

## Admin And Subscriptions

Module 11 replaces the subscriptions placeholder with platform subscription
administration and a safe vendor self-view. Subscription management is
`super_admin` only; vendor users can only read the current subscription for
their selected vendor.

Super admins can list, create, inspect, and update subscriptions:

```bash
curl "http://localhost:4000/api/v1/subscriptions?page=1&pageSize=20&status=active&search=acme" ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"

curl -X POST http://localhost:4000/api/v1/subscriptions ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"vendorId\":\"%VENDOR_ID%\",\"planCode\":\"growth\",\"status\":\"trialing\",\"billingCycle\":\"monthly\",\"startsAt\":\"2026-04-11\",\"endsAt\":\"2026-05-11\",\"notes\":\"Initial trial\"}"

curl http://localhost:4000/api/v1/subscriptions/%SUBSCRIPTION_ID% ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/subscriptions/%SUBSCRIPTION_ID% ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"active\",\"planCode\":\"growth\",\"notes\":\"Activated after onboarding\"}"
```

Vendor admins and staff can view only their own current subscription summary:

```bash
curl http://localhost:4000/api/v1/subscriptions/me ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Super admins can review a lightweight vendor overview and change vendor account
status using the existing vendor status values:

```bash
curl http://localhost:4000/api/v1/subscriptions/admin/vendors/%VENDOR_ID%/overview ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/subscriptions/admin/vendors/%VENDOR_ID%/status ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"suspended\",\"reason\":\"Billing hold\"}"
```

The current schema supports subscription `planCode`, status, billing cycle,
period dates, trial end, and metadata. Notes are stored inside subscription
metadata because there is no dedicated `notes` column. Vendor account status
uses the existing schema values: `draft`, `active`, `suspended`, and `archived`.

## Reports And Exports

Module 12 adds vendor-scoped reports and CSV exports built from the existing
transactional tables. Vendor admins and staff can report only on their current
vendor data; `super_admin` can use vendor-scoped reports with a selected vendor
context and can also access the limited platform overview.

Vendor users can load summary, order, invoice, payment, and customer statement
reports:

```bash
curl "http://localhost:4000/api/v1/reports/summary?dateFrom=2026-04-01&dateTo=2026-04-30" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/reports/orders?page=1&pageSize=20&dateFrom=2026-04-01&dateTo=2026-04-30&status=confirmed" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/reports/invoices?customerId=%CUSTOMER_ID%&status=issued" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/reports/payments?paymentMethod=bank_transfer&dateFrom=2026-04-01" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/reports/customer-statement/%CUSTOMER_ID%?dateFrom=2026-04-01&dateTo=2026-04-30" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

CSV exports use the same filters and tenant isolation:

```bash
curl "http://localhost:4000/api/v1/reports/exports/orders.csv?dateFrom=2026-04-01&dateTo=2026-04-30" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -o orders-report.csv

curl "http://localhost:4000/api/v1/reports/exports/invoices.csv?status=issued" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -o invoices-report.csv

curl "http://localhost:4000/api/v1/reports/exports/payments.csv?customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -o payments-report.csv

curl "http://localhost:4000/api/v1/reports/exports/customer-statement/%CUSTOMER_ID%.csv?dateFrom=2026-04-01" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -o customer-statement.csv
```

Super admins can load a deliberately small platform overview:

```bash
curl http://localhost:4000/api/v1/reports/admin/overview ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
```

## Notifications

Module 13 adds an in-app notification foundation. Notifications are stored per
recipient user, optionally scoped to a vendor, and include event code, type,
title, message, read state, metadata, timestamps, and `readAt`.

Authenticated users can list and read only their own notifications:

```bash
curl "http://localhost:4000/api/v1/notifications?page=1&pageSize=20&unreadOnly=true" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/notifications?eventCode=invoice.issued&dateFrom=2026-04-01" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/notifications/unread-count ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/notifications/%NOTIFICATION_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Read-state updates are intentionally small and predictable:

```bash
curl -X PATCH http://localhost:4000/api/v1/notifications/%NOTIFICATION_ID%/read ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/notifications/read-all ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

The first event hooks are in-app only and best-effort. Vendor admins receive key
vendor events such as `quotation.created`, `quotation.sent`, `order.confirmed`,
`invoice.issued`, `payment.received`, `route.created`, and `route.updated`.
Super admins receive platform events such as `subscription.status_changed` and
`vendor.status_changed`. A suspended vendor also creates a vendor-scoped
`vendor.suspended` notification for that vendor's admins.

## File And Attachment Foundation

Module 16 adds a safe local/dev attachment foundation. Files can be linked to
`customers`, `quotations`, `orders`, `invoices`, and `routes`; each target is
validated against the selected vendor context before metadata or bytes are
accepted.

File metadata lives in the `attachments` table from
`server/src/database/migrations/009_attachments.sql`. Local file bytes are stored
under `FILE_UPLOAD_DIR`, which defaults to `server/uploads`, and the upload size
limit is controlled by `FILE_UPLOAD_MAX_BYTES`. The upload folder is ignored by
git and is not served statically; downloads go through
`GET /api/v1/files/:fileId/download` so tenant and role checks run first.

Use `POST /api/v1/files` with a multipart field named `file` plus `entityType`,
`entityId`, and optional JSON `metadata`. `vendor_admin` and `super_admin` can
upload/delete with a valid vendor context; `vendor_staff` is read-only.

## Printable Document Groundwork

Module 17 adds structured JSON print payloads for quotations and invoices:

```bash
curl http://localhost:4000/api/v1/quotations/%QUOTATION_ID%/print ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/invoices/%INVOICE_ID%/print ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

The output is not rendered HTML and does not include generated PDF bytes yet.
It is a consistent document envelope with `header`, `vendor`, `customer`,
`items`, `totals`, and `footer` sections, plus render metadata for browser print
screens and future PDF generation. The endpoints use the same tenant-isolated
read permissions as quotation and invoice detail views, and future generated
PDFs can be attached through the Module 16 attachment foundation.

## Document Share Hardening

Document share links for quotations and invoices now support active, revoked,
and expired states. Apply `server/src/database/migrations/020_document_share_hardening.sql`
after the original `019_document_shares.sql` migration so `expires_at`,
`revoked_by`, and the supporting index exist in every environment.

Vendor users can keep using the existing share endpoints plus these additive
actions:

- `POST /api/v1/quotations/:quotationId/share/revoke`
- `POST /api/v1/quotations/:quotationId/share/regenerate`
- `POST /api/v1/invoices/:invoiceId/share/revoke`
- `POST /api/v1/invoices/:invoiceId/share/regenerate`

Public share routes now reject invalid, revoked, expired, and rate-limited
access safely with friendly API errors instead of leaking internal failures.
The frontend share modal surfaces view metadata, expiry state, revoke, and
regenerate actions. If SMTP is not configured, the email flow degrades
gracefully by guiding users to copy the secure link manually.

## Frontend Integration Helpers

Module 18 adds screen-friendly helper endpoints for common frontend fetches.
Lookups return compact selector records with `id`, `label`, `secondaryText`, and
optional `status` fields:

```bash
curl "http://localhost:4000/api/v1/lookups/customers?search=jane&limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/lookups/products?status=active&limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/lookups/options" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

UI helpers bundle bounded data for common screens:

```bash
curl "http://localhost:4000/api/v1/ui/dashboard" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/ui/create-context?limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/ui/notifications-panel?limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

These helpers are tenant-scoped where relevant, `lookups/vendors` is
`super_admin` only, lookup limits are capped at 50, and UI bundle limits are
capped at 30. They do not replace the core CRUD or report endpoints.

## Frontend App Shell

Module 20A replaces the placeholder foundation overview with a real frontend
shell and dashboard foundation. The client now includes a login screen,
auth-aware API service layer, protected session loading through `/api/v1/auth/me`,
responsive sidebar/topbar layout, logout flow, and dashboard widgets powered by
`/api/v1/ui/dashboard` and `/api/v1/ui/notifications-panel`.

Module 20B adds the first operational frontend screens in that shell:
Customers, Categories, and Products. These screens use the real vendor-scoped
backend APIs for list/search/filter, pagination, create, and edit flows. Product
category options are loaded from the existing categories endpoint, and all write
permissions continue to be enforced by the backend role and vendor guards.

Module 20C hardens the frontend foundation with URL-based navigation for
`/dashboard`, `/customers`, `/categories`, and `/products`, direct refresh and
browser back/forward support, a safe not-found workspace page, lightweight toast
feedback, and practical inline validation for the master-data forms.

Module 20D adds the first transactional frontend flows for Quotations and
Orders. The app now includes `/quotations`, `/quotations/new`,
`/quotations/:id`, `/orders`, `/orders/new`, and `/orders/:id`, with list,
create, and detail screens powered by the existing backend endpoints. Line item
totals are previewed in the browser, while the backend remains the source of
truth for final totals and workflow rules.

Module 20E adds the frontend invoice and payment foundation. The app now
includes `/invoices` and `/invoices/:id`, with invoice search/filter/pagination,
invoice detail, line items, totals, paid/outstanding summaries, payment history,
and a guarded payment capture form backed by the existing `/api/v1/payments`
endpoint.

Module 20F completes the first invoice lifecycle pass in the frontend. The app
now includes `/invoices/new` for manual invoice creation and
`/invoices/from-order/:id` for order-based invoice creation using the existing
`POST /api/v1/invoices` contract. Invoice detail also includes a Print /
Download entry point backed by `GET /api/v1/invoices/:invoiceId/print`; because
the backend currently returns structured JSON instead of PDF bytes, the client
opens a browser print view that can be printed or saved as PDF.

Module 20G adds frontend customer ledger and receivables visibility. The app now
includes `/ledger` for a paged customer receivables overview and
`/ledger/customers/:id` for a statement-style customer ledger with debit,
credit, document reference, and backend-provided running balance. The overview
uses existing customer and invoice endpoints for the visible page; the detail
screen uses `GET /api/v1/ledger/customer/:customerId`.

Module 20H adds frontend reports and exports. The app now includes `/reports`,
`/reports/receivables`, `/reports/invoices`, `/reports/payments`,
`/reports/orders`, and `/reports/statements`. Report screens use the existing
backend report endpoints and CSV exports for orders, invoices, payments, and
customer statements. The receivables report groups invoice report rows by
customer because there is no dedicated receivables aggregate endpoint yet.

Run the app locally:

```bash
npm run db:bootstrap
npm run dev
```

Then open `http://localhost:5173` and sign in with a seeded vendor admin:

```text
vendor.admin@supplylink.local / Password123!
```

The client expects `VITE_API_BASE_URL=/api/v1` in `client/.env.development`.

## API Hardening And Tests

Module 14 adds a centralized vendor write policy and a lightweight automated
test suite. Vendor-scoped write routes now run a shared policy after vendor
access resolution; non-super-admin users are blocked from write operations when
the vendor account is `suspended` or `archived`. `super_admin` platform actions
remain available.

Creation validation now rejects unsafe terminal starting states for the most
important transactional records, such as creating already accepted quotations,
delivered orders, paid invoices, or completed routes. List responses continue to
use the existing `{ items, pagination, filters }` shape with bounded page sizes.

Run the tests with:

```bash
npm run test
```

Run the DB-backed integration tests with:

```bash
copy server\.env.test.example server\.env.test
# Edit server\.env.test so TEST_DATABASE_URL points at an isolated database such as supplylink_test.
npm run test:integration
```

The integration harness refuses to run unless the database name includes `test`.
It applies migrations, truncates application data tables in the test database,
and then drives real API calls through an ephemeral Express server. If no
`TEST_DATABASE_URL` is configured, the integration test is skipped safely.

## Deployment Readiness And Demo Seed

Module 15 adds a practical local/demo bootstrap path and a readiness check.
Configure `server/.env.development` with `DATABASE_URL` and a non-default
`JWT_SECRET`, then run:

```bash
npm run db:bootstrap
```

The seed data is clearly marked as demo data and includes:

- super admin: `super.admin@supplylink.local`
- vendor admin: `vendor.admin@supplylink.local`
- password: `Password123!` by default, or `DEMO_SEED_PASSWORD` if set
- vendor: `Demo Supply Co`
- sample category, product, customer, quotation, order, invoice, payment, ledger entries, and subscription

The seed command is intended for local/test/demo databases. It refuses to run
with `NODE_ENV=production` unless `ALLOW_DEMO_SEED_IN_PRODUCTION=true` is set.

Deployment basics:

```bash
npm install
npm run test
npm run build
npm run db:migrate --workspace server
npm run start
```

Use the readiness endpoint for deployment checks:

```bash
curl http://localhost:4000/api/v1/system/readiness
```

Readiness checks confirm database configuration/connectivity and JWT secret
configuration. It returns HTTP 503 when the API is not ready.

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Foundation overview: `http://localhost:4000/api/v1/system/overview`
- Readiness check: `http://localhost:4000/api/v1/system/readiness`
