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
- `GET /api/v1/quotations`
- `POST /api/v1/quotations`
- `GET /api/v1/quotations/:quotationId`
- `PATCH /api/v1/quotations/:quotationId`
- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:orderId`
- `PATCH /api/v1/orders/:orderId`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:invoiceId`
- `PATCH /api/v1/invoices/:invoiceId`
- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `GET /api/v1/payments/:paymentId`
- `PATCH /api/v1/payments/:paymentId`
- `GET /api/v1/ledger`
- `GET /api/v1/ledger/customer/:customerId`
- `GET /api/v1/system/health`
- `GET /api/v1/system/overview`
- `GET /api/v1/system/modules`

## Database

- Migration files live in [server/src/database/migrations/001_initial_foundation.sql](/d:/supplylink/server/src/database/migrations/001_initial_foundation.sql)
- Auth and membership extension lives in [server/src/database/migrations/002_auth_and_vendor_memberships.sql](/d:/supplylink/server/src/database/migrations/002_auth_and_vendor_memberships.sql)
- Quotation line items live in [server/src/database/migrations/003_quotation_items.sql](/d:/supplylink/server/src/database/migrations/003_quotation_items.sql)
- Order item snapshots live in [server/src/database/migrations/004_order_item_snapshots.sql](/d:/supplylink/server/src/database/migrations/004_order_item_snapshots.sql)
- Invoice line items live in [server/src/database/migrations/005_invoice_items.sql](/d:/supplylink/server/src/database/migrations/005_invoice_items.sql)
- Payment relationship and ledger idempotency guards live in [server/src/database/migrations/006_payments_relationship_and_ledger_guards.sql](/d:/supplylink/server/src/database/migrations/006_payments_relationship_and_ledger_guards.sql)
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

## Quotation Notes

- Quotations are vendor-scoped through `quotations.vendor_id`.
- Quotation detail includes line items from `quotation_items`.
- `vendor_admin` users can create and update draft or sent quotations for their current vendor.
- `vendor_staff` users can list and inspect quotations, but cannot write them.
- `super_admin` users can inspect or manage quotations with a selected vendor context or `vendorId` query parameter.
- The API validates that the customer is linked to the current vendor through `vendor_customer_relationships`.
- The API validates that every quoted product belongs to the current vendor.
- Totals are calculated on the server from line item quantity, unit price, discount, and tax values.
- Quote numbers are vendor-scoped. If `quoteNumber` is omitted, the API generates one like `Q-20260411-AB12CD34`.
- Quotations in `accepted`, `rejected`, or `expired` status are treated as finalized and cannot be patched.

Example quotation requests:

```bash
curl -X POST http://localhost:4000/api/v1/quotations ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"issueDate\":\"2026-04-11\",\"expiryDate\":\"2026-04-25\",\"notes\":\"Introductory quote\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":2,\"unitPrice\":8.99,\"discount\":1,\"tax\":0.5}]}"

curl "http://localhost:4000/api/v1/quotations?page=1&pageSize=20&status=draft&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/quotations/%QUOTATION_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/quotations/%QUOTATION_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"sent\",\"notes\":\"Sent to customer\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":3,\"unitPrice\":8.99,\"discountTotal\":0,\"taxTotal\":0.75}]}"
```

## Order Notes

- Orders are vendor-scoped through `orders.vendor_id`.
- Order detail includes line items from `order_items`.
- `vendor_admin` users can create and update orders for their current vendor.
- `vendor_staff` users can list and inspect orders, but cannot write them.
- `super_admin` users can inspect or manage orders with a selected vendor context or `vendorId` query parameter.
- Direct order creation validates that the customer is linked to the current vendor and every product belongs to the current vendor.
- Orders may also be created from an existing same-vendor quotation by passing `quotationId`; if `items` are omitted, quotation line items are copied into the order.
- Totals are calculated on the server from line item quantity, unit price, discount, and tax values.
- Order numbers are vendor-scoped. If `orderNumber` is omitted, the API generates one like `O-20260411-AB12CD34`.
- Delivered and cancelled orders cannot be patched. Line items can only be replaced while an order is draft or confirmed.

Example direct order requests:

```bash
curl -X POST http://localhost:4000/api/v1/orders ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"orderDate\":\"2026-04-11\",\"requestedDeliveryDate\":\"2026-04-18\",\"notes\":\"Manual order\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":2,\"unitPrice\":8.99,\"discount\":1,\"tax\":0.5}]}"

curl "http://localhost:4000/api/v1/orders?page=1&pageSize=20&status=draft&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"confirmed\",\"notes\":\"Confirmed with customer\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":3,\"unitPrice\":8.99,\"discountTotal\":0,\"taxTotal\":0.75}]}"
```

Example create-from-quotation request:

```bash
curl -X POST http://localhost:4000/api/v1/orders ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"quotationId\":\"%QUOTATION_ID%\",\"orderDate\":\"2026-04-11\",\"requestedDeliveryDate\":\"2026-04-18\",\"status\":\"confirmed\"}"
```

## Invoice Notes

- Invoices are vendor-scoped through `invoices.vendor_id`.
- Invoice detail includes line items from `invoice_items`.
- `vendor_admin` users can create and update invoices for their current vendor.
- `vendor_staff` users can list and inspect invoices, but cannot write them.
- `super_admin` users can inspect or manage invoices with a selected vendor context or `vendorId` query parameter.
- Direct invoice creation validates that the customer is linked to the current vendor and every product belongs to the current vendor.
- Invoices may also be created from an existing same-vendor order by passing `orderId`; if `items` are omitted, order line items are copied into the invoice.
- Totals are calculated on the server from line item quantity, unit price, discount, and tax values.
- Invoice numbers are vendor-scoped. If `invoiceNumber` is omitted, the API generates one like `I-20260411-AB12CD34`.
- Paid and void invoices cannot be patched. Line items can only be replaced while an invoice is draft.

Example direct invoice requests:

```bash
curl -X POST http://localhost:4000/api/v1/invoices ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"issueDate\":\"2026-04-11\",\"dueDate\":\"2026-04-25\",\"notes\":\"Manual invoice\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":2,\"unitPrice\":8.99,\"discount\":1,\"tax\":0.5}]}"

curl "http://localhost:4000/api/v1/invoices?page=1&pageSize=20&status=draft&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/invoices/%INVOICE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/invoices/%INVOICE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"issued\",\"notes\":\"Issued to customer\",\"items\":[{\"productId\":\"%PRODUCT_ID%\",\"quantity\":3,\"unitPrice\":8.99,\"discountTotal\":0,\"taxTotal\":0.75}]}"
```

Example create-from-order request:

```bash
curl -X POST http://localhost:4000/api/v1/invoices ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"orderId\":\"%ORDER_ID%\",\"issueDate\":\"2026-04-11\",\"dueDate\":\"2026-04-25\",\"status\":\"issued\"}"
```

## Ledger And Payment Notes

- Payments and ledger entries are vendor-scoped.
- `vendor_admin` users can create payments and adjust safe payment reference fields.
- `vendor_staff` users can list and inspect payments and ledger entries, but cannot write them.
- Invoice-linked payments validate the invoice belongs to the current vendor and matches the payment customer.
- On-account payments are supported by omitting `invoiceId`.
- Invoice-linked payments reject overpayment; extra funds should be recorded as a separate on-account payment.
- Invoice receivable ledger entries are maintained when invoices are issued and when payments are created for invoices.
- Payment creation creates a credit ledger entry and recalculates invoice balance/status.
- Payment amount, customer, and invoice linkage are intentionally immutable after creation.

Example payment requests:

```bash
curl -X POST http://localhost:4000/api/v1/payments ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"invoiceId\":\"%INVOICE_ID%\",\"paymentDate\":\"2026-04-12\",\"amount\":25.50,\"paymentMethod\":\"bank_transfer\",\"referenceNumber\":\"PAY-1001\",\"notes\":\"Partial payment\"}"

curl -X POST http://localhost:4000/api/v1/payments ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"customerId\":\"%CUSTOMER_ID%\",\"paymentDate\":\"2026-04-12\",\"amount\":10,\"paymentMethod\":\"cash\",\"referenceNumber\":\"ADV-1001\",\"notes\":\"On-account payment\"}"

curl "http://localhost:4000/api/v1/payments?page=1&pageSize=20&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/payments/%PAYMENT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/payments/%PAYMENT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"referenceNumber\":\"PAY-1001-UPDATED\",\"notes\":\"Updated bank reference\"}"
```

Example ledger requests:

```bash
curl "http://localhost:4000/api/v1/ledger?page=1&pageSize=20&customerId=%CUSTOMER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/ledger/customer/%CUSTOMER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```
