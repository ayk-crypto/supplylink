import assert from "node:assert/strict";
import test from "node:test";
import { attachmentQuerySchema } from "./files/files.schemas.js";
import { invoiceCreateBodySchema } from "./invoices/invoices.schemas.js";
import { notificationQuerySchema } from "./notifications/notifications.schemas.js";
import { orderCreateBodySchema } from "./orders/orders.schemas.js";
import { quotationCreateBodySchema } from "./quotations/quotations.schemas.js";
import { routeCreateBodySchema } from "./routes/routes.schemas.js";

const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCT_ID = "22222222-2222-4222-8222-222222222222";
const ORDER_ID = "33333333-3333-4333-8333-333333333333";

const lineItem = {
  productId: PRODUCT_ID,
  quantity: 1,
  unitPrice: 10
};

test("quotation creation rejects terminal statuses", () => {
  const result = quotationCreateBodySchema.safeParse({
    customerId: CUSTOMER_ID,
    status: "accepted",
    items: [lineItem]
  });

  assert.equal(result.success, false);
});

test("order creation rejects delivered orders", () => {
  const result = orderCreateBodySchema.safeParse({
    customerId: CUSTOMER_ID,
    status: "delivered",
    items: [lineItem]
  });

  assert.equal(result.success, false);
});

test("invoice creation rejects paid invoices", () => {
  const result = invoiceCreateBodySchema.safeParse({
    customerId: CUSTOMER_ID,
    status: "paid",
    items: [lineItem]
  });

  assert.equal(result.success, false);
});

test("route creation rejects completed routes", () => {
  const result = routeCreateBodySchema.safeParse({
    name: "North Loop",
    status: "completed"
  });

  assert.equal(result.success, false);
});

test("notification unreadOnly query parsing handles false safely", () => {
  const result = notificationQuerySchema.safeParse({
    unreadOnly: "false"
  });

  assert.equal(result.success, true);
  assert.equal(result.data.unreadOnly, false);
});

test("attachment query requires entityType when entityId is provided", () => {
  const missingType = attachmentQuerySchema.safeParse({
    entityId: ORDER_ID
  });
  const completeFilter = attachmentQuerySchema.safeParse({
    entityType: "orders",
    entityId: ORDER_ID
  });

  assert.equal(missingType.success, false);
  assert.equal(completeFilter.success, true);
});
