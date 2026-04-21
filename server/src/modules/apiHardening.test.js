import assert from "node:assert/strict";
import test from "node:test";
import { attachmentQuerySchema } from "./files/files.schemas.js";
import { invoiceCreateBodySchema, invoiceUpdateBodySchema } from "./invoices/invoices.schemas.js";
import { notificationQuerySchema } from "./notifications/notifications.schemas.js";
import { orderCreateBodySchema, orderUpdateBodySchema } from "./orders/orders.schemas.js";
import {
  quotationCreateBodySchema,
  quotationUpdateBodySchema
} from "./quotations/quotations.schemas.js";
import { routeCreateBodySchema } from "./routes/routes.schemas.js";
import {
  routeTemplateCreateBodySchema,
  routeTemplateGenerateBodySchema
} from "./route-templates/routeTemplates.schemas.js";
import { settingsUpdateBodySchema } from "./settings/settings.schemas.js";

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

test("generic quotation patch rejects status and item lifecycle changes", () => {
  const statusResult = quotationUpdateBodySchema.safeParse({
    status: "accepted"
  });
  const itemResult = quotationUpdateBodySchema.safeParse({
    items: [lineItem]
  });

  assert.equal(statusResult.success, false);
  assert.equal(itemResult.success, false);
});

test("generic order patch rejects status and item lifecycle changes", () => {
  const statusResult = orderUpdateBodySchema.safeParse({
    status: "delivered"
  });
  const itemResult = orderUpdateBodySchema.safeParse({
    items: [lineItem]
  });

  assert.equal(statusResult.success, false);
  assert.equal(itemResult.success, false);
});

test("generic invoice patch rejects direct paid and partially paid status changes", () => {
  const paidResult = invoiceUpdateBodySchema.safeParse({
    status: "paid"
  });
  const partiallyPaidResult = invoiceUpdateBodySchema.safeParse({
    status: "partially_paid"
  });

  assert.equal(paidResult.success, false);
  assert.equal(partiallyPaidResult.success, false);
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

test("route template creation validates weekly recurrence days", () => {
  const valid = routeTemplateCreateBodySchema.safeParse({
    name: "Weekly north route",
    recurrenceDays: [1, 3, 5]
  });
  const duplicate = routeTemplateCreateBodySchema.safeParse({
    name: "Duplicate weekdays",
    recurrenceDays: [1, 1]
  });
  const outOfRange = routeTemplateCreateBodySchema.safeParse({
    name: "Impossible weekday",
    recurrenceDays: [7]
  });

  assert.equal(valid.success, true);
  assert.deepEqual(valid.data.recurrenceDays, [1, 3, 5]);
  assert.equal(duplicate.success, false);
  assert.equal(outOfRange.success, false);
});

test("route template generation accepts only route creation statuses", () => {
  const valid = routeTemplateGenerateBodySchema.safeParse({
    routeDate: "2026-05-04",
    status: "planned"
  });
  const invalid = routeTemplateGenerateBodySchema.safeParse({
    routeDate: "2026-05-04",
    status: "completed"
  });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("settings update accepts valid partial sections", () => {
  const result = settingsUpdateBodySchema.safeParse({
    company: {
      primaryBrandColor: "#1F6FEB",
      logoUrl: "/api/v1/settings/logo"
    },
    invoice: {
      prefix: "INV",
      nextNumber: 10,
      padding: 6
    },
    preferences: {
      notificationsBadgeEnabled: true
    }
  });

  assert.equal(result.success, true);
});

test("settings update rejects invalid bounds and formats", () => {
  const invalidEmail = settingsUpdateBodySchema.safeParse({
    company: {
      email: "not-an-email"
    }
  });
  const invalidInvoiceNumber = settingsUpdateBodySchema.safeParse({
    invoice: {
      nextNumber: 0
    }
  });
  const invalidPadding = settingsUpdateBodySchema.safeParse({
    invoice: {
      padding: 99
    }
  });
  const invalidDecimals = settingsUpdateBodySchema.safeParse({
    currency: {
      decimals: 9
    }
  });
  const invalidPageSize = settingsUpdateBodySchema.safeParse({
    preferences: {
      defaultPageSize: 500
    }
  });
  const invalidBrandColor = settingsUpdateBodySchema.safeParse({
    company: {
      primaryBrandColor: "blue"
    }
  });

  assert.equal(invalidEmail.success, false);
  assert.equal(invalidInvoiceNumber.success, false);
  assert.equal(invalidPadding.success, false);
  assert.equal(invalidDecimals.success, false);
  assert.equal(invalidPageSize.success, false);
  assert.equal(invalidBrandColor.success, false);
});
