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
- real vendor and customer management modules plus placeholder domain modules for future SaaS features

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

## Vendor Management Notes

- `GET /api/v1/vendors/me` lets authenticated vendor users fetch the selected/current vendor profile.
- `PATCH /api/v1/vendors/me` lets `vendor_admin` users update safe profile fields for their own vendor.
- `GET /api/v1/vendors/me/members` lets `vendor_admin` users view active tenant membership details.
- `GET /api/v1/vendors`, `GET /api/v1/vendors/:vendorId`, `PATCH /api/v1/vendors/:vendorId`, and `GET /api/v1/vendors/:vendorId/members` are platform-admin friendly routes; listing and cross-vendor updates require `super_admin`.
- The current vendor table has no address columns, so address fields are intentionally not exposed until a future migration adds them.

## Customer Management Notes

- Customers are shared platform-level master records in `customers`.
- Vendor ownership, notes, account codes, pricing references, and status live in `vendor_customer_relationships`.
- `vendor_admin` and `vendor_staff` can list and inspect only customers linked to their current vendor.
- `vendor_staff` is read-only for this module.
- `vendor_admin` can create and update customers for the current vendor.
- `super_admin` can use these endpoints with an explicit `vendorId` query parameter or a selected current vendor context.
- Duplicate customer matching is intentionally practical: creation reuses an existing master customer when the submitted email or phone matches an existing record. It then creates the vendor relationship unless that vendor-customer pair already exists.
- No migration was added for this module because the existing schema already includes the needed relationship fields: `account_code`, `status`, `credit_limit`, `price_list_code`, `notes`, `metadata`, and timestamps.

Example create request:

```bash
curl -X POST http://localhost:4000/api/v1/customers ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customer\":{\"fullName\":\"Jane Buyer\",\"companyName\":\"Buyer Co\",\"email\":\"jane.buyer@example.com\",\"phone\":\"+1-555-0111\",\"billingAddress\":{\"city\":\"Austin\"}},\"relationship\":{\"accountCode\":\"ACME-CUST-001\",\"status\":\"active\",\"creditLimit\":5000,\"priceListCode\":\"STANDARD\",\"notes\":\"Prefers morning deliveries\"}}"
```

Example list, detail, and update requests:

```bash
curl "http://localhost:4000/api/v1/customers?page=1&pageSize=20&search=jane&status=active" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/customers/%CUSTOMER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/customers/%CUSTOMER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customer\":{\"phone\":\"+1-555-0199\"},\"relationship\":{\"status\":\"inactive\",\"notes\":\"Paused ordering until next quarter\"}}"
```

## Catalog And Category Notes

- Categories and products are vendor-scoped through `vendor_id`.
- `vendor_admin` users can create and update categories and products for their current vendor.
- `vendor_staff` users can list and inspect catalog records, but cannot write them.
- `super_admin` users can inspect or manage catalog records with a selected vendor context or `vendorId` query parameter.
- Category uniqueness is enforced by the existing `(vendor_id, slug)` constraint.
- Product SKU uniqueness is enforced by the existing `(vendor_id, sku)` constraint.
- No migration was added for this module. The current category schema does not include status, and the current product schema stores `unit_price`, `status`, and `metadata`, but not first-class unit, cost, or currency columns.

Example category requests:

```bash
curl -X POST http://localhost:4000/api/v1/categories ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Beverages\",\"description\":\"Shelf-stable drinks\"}"

curl "http://localhost:4000/api/v1/categories?page=1&pageSize=20&search=bev" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/categories/%CATEGORY_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/categories/%CATEGORY_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"description\":\"Drinks and beverage inventory\"}"
```

Example product requests:

```bash
curl -X POST http://localhost:4000/api/v1/products ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sku\":\"BEV-001\",\"name\":\"Sparkling Water 12 Pack\",\"description\":\"Lime sparkling water case\",\"categoryId\":\"%CATEGORY_ID%\",\"unitPrice\":8.99,\"status\":\"active\",\"metadata\":{\"unit\":\"case\"}}"

curl "http://localhost:4000/api/v1/products?page=1&pageSize=20&status=active&categoryId=%CATEGORY_ID%&search=water" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/products/%PRODUCT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/products/%PRODUCT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"unitPrice\":9.49,\"status\":\"active\",\"metadata\":{\"unit\":\"case\",\"cost\":6.25}}"
```
