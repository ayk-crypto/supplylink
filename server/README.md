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
- Use `.env.test` for DB-backed integration tests; [server/.env.test.example](/d:/supplylink/server/.env.test.example) provides a template
- Use `.env.production` for production deployments
- If `NODE_ENV` is not set, the server defaults to `development`
- `DATABASE_URL` is only required for database-backed work such as migrations or DB health checks
- `JWT_SECRET` must be set to a long random value outside local throwaway development
- `DEMO_SEED_PASSWORD` controls the password used by the demo seed script
- `ALLOW_DEMO_SEED_IN_PRODUCTION` defaults to `false` and should stay false for normal deployments
- `FILE_UPLOAD_DIR` controls the local/dev upload directory and defaults to `uploads` under the server workspace
- `FILE_UPLOAD_MAX_BYTES` controls the multipart upload limit and defaults to `10485760` bytes
- `TEST_DATABASE_URL` is used by the integration test harness when present; the database name must include `test`

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
- `GET /api/v1/system/health`
- `GET /api/v1/system/readiness`
- `GET /api/v1/system/overview`
- `GET /api/v1/system/modules`

## Database

- Migration files live in [server/src/database/migrations/001_initial_foundation.sql](/d:/supplylink/server/src/database/migrations/001_initial_foundation.sql)
- Auth and membership extension lives in [server/src/database/migrations/002_auth_and_vendor_memberships.sql](/d:/supplylink/server/src/database/migrations/002_auth_and_vendor_memberships.sql)
- Quotation line items live in [server/src/database/migrations/003_quotation_items.sql](/d:/supplylink/server/src/database/migrations/003_quotation_items.sql)
- Order item snapshots live in [server/src/database/migrations/004_order_item_snapshots.sql](/d:/supplylink/server/src/database/migrations/004_order_item_snapshots.sql)
- Invoice line items live in [server/src/database/migrations/005_invoice_items.sql](/d:/supplylink/server/src/database/migrations/005_invoice_items.sql)
- Payment relationship and ledger idempotency guards live in [server/src/database/migrations/006_payments_relationship_and_ledger_guards.sql](/d:/supplylink/server/src/database/migrations/006_payments_relationship_and_ledger_guards.sql)
- Route planning extensions live in [server/src/database/migrations/007_route_planning_foundation.sql](/d:/supplylink/server/src/database/migrations/007_route_planning_foundation.sql)
- Subscription administration uses the existing `subscriptions` and `vendors.status` schema from the foundation migration.
- Reports and exports read from the existing transactional tables and do not add reporting tables.
- In-app notifications live in [server/src/database/migrations/008_notifications.sql](/d:/supplylink/server/src/database/migrations/008_notifications.sql)
- Attachment metadata lives in [server/src/database/migrations/009_attachments.sql](/d:/supplylink/server/src/database/migrations/009_attachments.sql)
- Run `npm run db:migrate` inside the `server` workspace after setting `DATABASE_URL`
- Run `npm run db:seed` inside the `server` workspace to create local/demo records
- Run `npm run db:bootstrap` inside the `server` workspace to migrate and then seed
- Run `npm run test` inside the `server` workspace to execute the built-in Node test suite

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
  -d "{\"unitPrice\":9.49,\"lowStockThreshold\":10,\"status\":\"active\",\"metadata\":{\"unit\":\"case\",\"cost\":6.25}}"
```

## Inventory Notes

- Inventory is vendor-scoped through `products.vendor_id` and `stock_movements.vendor_id`.
- Product responses include `stockQuantity`, `lowStockThreshold`, and `isLowStock`.
- Manual stock changes should use `POST /api/v1/inventory/adjust` so a movement trail is preserved.
- Confirming an order creates outbound stock movements once per order and reduces product stock.
- Cancelling a confirmed or packed order creates inbound reversal movements once per order and restores product stock.
- Stock availability enforcement is controlled by `ENFORCE_STOCK_AVAILABILITY`; it defaults to `false` to preserve existing order flows. When set to `true`, confirmed orders are rejected if tracked product stock is insufficient.

Example inventory requests:

```bash
curl "http://localhost:4000/api/v1/inventory/products?page=1&pageSize=20" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/inventory/products/%PRODUCT_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/inventory/movements?productId=%PRODUCT_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X POST http://localhost:4000/api/v1/inventory/adjust ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"productId\":\"%PRODUCT_ID%\",\"type\":\"inbound\",\"quantity\":25,\"notes\":\"Initial stock receipt\"}"
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

## Printable Document Notes

- Quotation and invoice print endpoints return structured JSON, not HTML or PDF bytes.
- The response shape is document-oriented and consistent across both record types: `header`, `vendor`, `customer`, `items`, `totals`, and `footer`.
- The payload includes `output.renderTargets` for `browser_print` and `future_pdf`, plus `pdfGenerated: false` to make the current limitation explicit.
- Tenant isolation follows the existing quotation and invoice read paths: `vendor_admin` and `vendor_staff` can read print documents for their own vendor, and `super_admin` can inspect with a selected vendor context such as `vendorId`.
- The document service is intentionally compatible with the attachment foundation: future generated PDFs can be saved as attachments using the same entity IDs, but this pass does not generate or attach PDFs.
- No template engine, branding system, PDF renderer, email delivery, or external rendering service is configured yet.

Example printable quotation request:

```bash
curl http://localhost:4000/api/v1/quotations/%QUOTATION_ID%/print ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Example printable invoice request:

```bash
curl http://localhost:4000/api/v1/invoices/%INVOICE_ID%/print ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Example `super_admin` vendor-scoped printable document request:

```bash
curl "http://localhost:4000/api/v1/invoices/%INVOICE_ID%/print?vendorId=%VENDOR_ID%" ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
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

## Route Planning Notes

- Routes and route stops are vendor-scoped.
- `vendor_admin` users can create and update routes and route stops for their current vendor.
- `vendor_staff` users can list and inspect route plans, but cannot write them.
- Route stop customers must be linked to the current vendor.
- Route stop orders, when provided, must belong to the current vendor and match the stop customer.
- Stop ordering uses `sequenceNumber`; adding or moving stops shifts neighboring sequence values.
- Order workflow is intentionally not modified when adding stops.

Example route requests:

```bash
curl -X POST http://localhost:4000/api/v1/routes ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"North Loop\",\"routeDate\":\"2026-04-13\",\"status\":\"planned\",\"vehicleLabel\":\"Van 12\",\"notes\":\"Morning deliveries\"}"

curl "http://localhost:4000/api/v1/routes?page=1&pageSize=20&status=planned&routeDate=2026-04-13" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/routes/%ROUTE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/routes/%ROUTE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"in_progress\",\"vehicleLabel\":\"Van 14\"}"
```

Example route stop requests:

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

## Admin And Subscription Notes

- Subscription management is restricted to `super_admin`.
- Vendor users can only read the current subscription summary for their selected vendor through `GET /api/v1/subscriptions/me`.
- Creating a live subscription prevents another live subscription for the same vendor. Live statuses are `trialing`, `active`, and `past_due`.
- The current subscription schema supports `plan_code`, `status`, `billing_cycle`, current period dates, trial end, metadata, and timestamps.
- Notes are stored in subscription metadata because the current table has no dedicated `notes` column.
- Vendor account status updates use the existing vendor status values: `draft`, `active`, `suspended`, and `archived`.
- Vendor account status is recorded as a platform control; broad enforcement across every vendor workflow can be added later as a centralized policy layer.

Example super admin subscription requests:

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

Example vendor self-view request:

```bash
curl http://localhost:4000/api/v1/subscriptions/me ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Example admin vendor overview and status requests:

```bash
curl http://localhost:4000/api/v1/subscriptions/admin/vendors/%VENDOR_ID%/overview ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/subscriptions/admin/vendors/%VENDOR_ID%/status ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":\"suspended\",\"reason\":\"Billing hold\"}"
```

## Report And Export Notes

- Reports are read-only and vendor-scoped by default.
- `vendor_admin` and `vendor_staff` users can load reports only for their current vendor.
- `super_admin` users can load vendor-scoped reports by providing a selected vendor context, such as a `vendorId` query parameter, and can load the limited platform overview.
- CSV exports use the same filters and tenant isolation as the JSON report endpoints.
- CSV export size is capped at 5000 rows per request for this first reporting foundation.
- Customer statements are built from `ledger_entries` and include opening balance, running balance, and ending balance.
- No PDF, scheduled report, charting, or BI aggregation layer is included yet.

Example vendor report requests:

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

Example CSV export requests:

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

Example super admin overview request:

```bash
curl http://localhost:4000/api/v1/reports/admin/overview ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
```

## Notification Notes

- Notifications are in-app only in this module.
- Each notification row belongs to one recipient user.
- `vendor_id` is nullable so platform notifications for super admins can stay separate from vendor-scoped business notifications.
- Authenticated users can list, inspect, and mark only their own notifications.
- Vendor business events currently notify active `vendor_admin` users for the vendor.
- Super admin platform events notify active `super_admin` users.
- Notification generation is best-effort after the main business operation succeeds, so notification delivery does not become a fragile dependency for quotations, orders, invoices, payments, routes, or subscription updates.
- No email, SMS, WhatsApp, websocket, queue, retry, or background worker provider is configured yet.

The first event hooks create notifications for:

- `quotation.created`
- `quotation.sent`
- `order.confirmed`
- `invoice.issued`
- `payment.received`
- `route.created`
- `route.updated`
- `subscription.status_changed`
- `vendor.status_changed`
- `vendor.suspended`

Example notification requests:

```bash
curl "http://localhost:4000/api/v1/notifications?page=1&pageSize=20&unreadOnly=true" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/notifications?eventCode=invoice.issued&dateFrom=2026-04-01" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/notifications/unread-count ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/notifications/%NOTIFICATION_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/notifications/%NOTIFICATION_ID%/read ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl -X PATCH http://localhost:4000/api/v1/notifications/read-all ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

## File And Attachment Notes

- Attachments are a local/dev foundation, not a full document management system.
- Attachment metadata is stored in `attachments`; file bytes are stored under `FILE_UPLOAD_DIR`.
- The upload directory is not mounted as public static content. Downloads go through `GET /api/v1/files/:fileId/download` so auth, role, and vendor isolation checks run first.
- Supported entity types are explicit: `customers`, `quotations`, `orders`, `invoices`, and `routes`.
- Customer attachments validate the vendor/customer relationship. Quotations, orders, invoices, and routes validate direct same-vendor ownership.
- `vendor_admin` and `super_admin` can upload and delete when a vendor context is selected and writable.
- `vendor_staff` can list, inspect, and download only files for their own vendor context.
- `super_admin` should pass `vendorId` in the query string, or use a token/current vendor context, for vendor-scoped inspection.
- Allowed MIME types are PDF, JPEG, PNG, WebP, plain text, CSV, JSON, Word, and Excel document formats.
- Local storage is intentionally small and swappable: the service persists `storage_backend`, `storage_key`, and `stored_filename` so future S3/object storage can plug in without changing the API shape.
- Antivirus scanning, thumbnails, public sharing links, versioning, and cloud storage are intentionally out of scope for this pass.

Example upload, list, entity list, detail, download, and delete requests:

```bash
curl -X POST http://localhost:4000/api/v1/files ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -F "entityType=orders" ^
  -F "entityId=%ORDER_ID%" ^
  -F "metadata={\"label\":\"proof of delivery\"}" ^
  -F "file=@C:\temp\proof.pdf;type=application/pdf"

curl "http://localhost:4000/api/v1/files?page=1&pageSize=20&entityType=orders&entityId=%ORDER_ID%" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/files/entity/orders/%ORDER_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/files/%FILE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl http://localhost:4000/api/v1/files/%FILE_ID%/download ^
  -H "Authorization: Bearer %VENDOR_TOKEN%" ^
  -o downloaded-proof.pdf

curl -X DELETE http://localhost:4000/api/v1/files/%FILE_ID% ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"
```

Example `super_admin` vendor-scoped inspection:

```bash
curl "http://localhost:4000/api/v1/files?vendorId=%VENDOR_ID%" ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
```

## Frontend Integration Helper Notes

- Lookup endpoints return compact selector objects with stable `id`, `label`, `secondaryText`, and optional `status` fields.
- Vendor-scoped lookup and UI endpoints use the same auth, role, and vendor access middleware as the business modules.
- `vendor_admin` and `vendor_staff` can use tenant-scoped helper endpoints for their current vendor.
- `super_admin` can use tenant-scoped helpers by passing a safe vendor context such as `vendorId`.
- `GET /api/v1/lookups/vendors` is `super_admin` only.
- Lookup limits are bounded to 50 items; UI bundle limits are bounded to 30 items.
- These endpoints are helper views only. They do not replace the core CRUD, report, notification, print, or file endpoints.

Example lookup requests:

```bash
curl "http://localhost:4000/api/v1/lookups/customers?search=jane&limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/lookups/products?search=water&status=active&limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/lookups/categories?limit=20" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/lookups/options" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/lookups/vendors?search=acme&status=active" ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
```

Example UI helper requests:

```bash
curl "http://localhost:4000/api/v1/ui/dashboard" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/ui/create-context?limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/ui/notifications-panel?limit=10" ^
  -H "Authorization: Bearer %VENDOR_TOKEN%"

curl "http://localhost:4000/api/v1/ui/dashboard?vendorId=%VENDOR_ID%" ^
  -H "Authorization: Bearer %SUPER_ADMIN_TOKEN%"
```

## API Hardening And Test Notes

- Vendor-scoped write routes use [requireVendorWritable.js](/d:/supplylink/server/src/middlewares/requireVendorWritable.js) after vendor access has been resolved.
- Non-super-admin users cannot perform vendor write operations while the vendor account is `suspended` or `archived`.
- `super_admin` users bypass the vendor write block so platform administration remains possible.
- Create-time validation now rejects unsafe terminal starting states for quotations, orders, invoices, and routes.
- Tests use Node's built-in `node:test` runner and do not require a database connection for the current policy/schema coverage.

Run server tests:

```bash
npm run test --workspace server
```

Run DB-backed integration tests:

```bash
copy server\.env.test.example server\.env.test
# Edit server\.env.test so TEST_DATABASE_URL points at an isolated database such as supplylink_test.
npm run test:integration --workspace server
```

Integration test behavior:

- The test database name must include `test`; the harness refuses to run otherwise.
- The harness runs the normal SQL migrations before starting the Express app.
- The harness truncates application data tables in the test database before the scenario.
- Roles and `schema_migrations` are preserved so migrations remain idempotent.
- If `TEST_DATABASE_URL` is missing, the integration test is skipped instead of touching a developer database.
- The scenario covers auth register/login/me, tenant isolation, quotation/order/invoice/payment flow, invoice balance changes, overpayment rejection, ledger/customer statement, notifications, reports, UI helpers, lookups, and file attachment isolation.

## Deployment Readiness And Seed Notes

- `GET /api/v1/system/readiness` returns HTTP 200 when deployment-critical checks pass and HTTP 503 when they do not.
- Readiness currently checks database configuration/connectivity and JWT secret configuration.
- Demo seeding is implemented in [seed.js](/d:/supplylink/server/src/database/scripts/seed.js).
- The demo seed is idempotent for the named demo records and is meant for fresh local/test/demo databases.
- The seed command refuses `NODE_ENV=production` unless `ALLOW_DEMO_SEED_IN_PRODUCTION=true` is explicitly set.
- Run migrations before seeding; missing demo tables indicate the database is behind the current migration set.

Bootstrap local demo data:

```bash
npm run db:bootstrap --workspace server
```

Seeded login details:

```text
Super admin: super.admin@supplylink.local / Password123!
Vendor admin: vendor.admin@supplylink.local / Password123!
```

Set `DEMO_SEED_PASSWORD` in `server/.env.development` to override that password.

Suggested deployment sequence:

```bash
npm install
npm run test --workspace server
npm run build --workspace server
npm run db:migrate --workspace server
npm run start --workspace server
```
