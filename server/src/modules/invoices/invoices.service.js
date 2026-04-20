import { randomUUID } from "crypto";
import AppError from "../../core/errors/AppError.js";
import {
  createInvoiceWithItems,
  findCustomerRelationshipForVendor,
  findInvoiceForVendor,
  findOrderForVendor,
  listInvoiceItemsForVendor,
  listInvoicesForVendor,
  listOrderItemsForInvoice,
  listProductsByIdsForVendor,
  updateInvoiceWithOptionalItems
} from "./invoices.repository.js";
import { ensureInvoiceLedgerEntry, voidInvoiceLedgerEntry } from "../ledger/ledger.repository.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";

const EDITABLE_FIELDS_BY_STATUS = {
  draft: ["issueDate", "dueDate", "notes"],
  issued: ["dueDate", "notes"],
  partially_paid: ["dueDate", "notes"]
};
const INVOICEABLE_ORDER_STATUSES = ["confirmed", "packed", "dispatched", "delivered"];
const INVOICE_TRANSITIONS = {
  issue: { from: ["draft"], to: "issued" },
  void: { from: ["issued"], to: "void" }
};
const INVOICE_EVENT_CONTENT = {
  issued: {
    eventCode: "invoice.issued",
    title: "Invoice issued",
    message: (detail) =>
      `Invoice ${detail.invoiceNumber} was issued for ${detail.customer.companyName || detail.customer.fullName}.`
  },
  void: {
    eventCode: "invoice.voided",
    title: "Invoice voided",
    message: (detail) => `Invoice ${detail.invoiceNumber} was voided.`
  }
};
const HEADER_FIELDS = {
  issueDate: "issue_date",
  dueDate: "due_date",
  notes: "notes"
};

function toColumnPayload(input = {}, fieldMap) {
  const payload = {};

  Object.entries(fieldMap).forEach(([inputKey, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      payload[column] = input[inputKey];
    }
  });

  return payload;
}

function toNumber(value) {
  return Number(value || 0);
}

function toMoney(cents) {
  return Number((cents / 100).toFixed(2));
}

function toCents(value) {
  return Math.round(toNumber(value) * 100);
}

function calculateBalanceDue(status, grandTotal) {
  if (status === "paid" || status === "void") {
    return 0;
  }

  return grandTotal;
}

function calculateLineItem(input, product, index) {
  const quantity = toNumber(input.quantity);
  const unitPrice = Object.prototype.hasOwnProperty.call(input, "unitPrice")
    ? toNumber(input.unitPrice)
    : toNumber(input.unit_price ?? product.unit_price);
  const grossCents = Math.round(quantity * unitPrice * 100);
  const discountCents = toCents(input.discountTotal ?? input.discount_total ?? input.discount ?? 0);
  const taxCents = toCents(input.taxTotal ?? input.tax_total ?? input.tax ?? 0);
  const lineTotalCents = grossCents - discountCents + taxCents;

  if (lineTotalCents < 0) {
    throw new AppError("Line item total cannot be negative", {
      statusCode: 422,
      code: "INVALID_LINE_TOTAL",
      details: [
        {
          path: `items.${index}`,
          message: "Discount cannot exceed line subtotal plus tax"
        }
      ]
    });
  }

  return {
    product_id: product.id,
    sequence_number: index + 1,
    description: input.description || `${product.sku} - ${product.name}`,
    quantity,
    unit_price: unitPrice,
    discount_total: toMoney(discountCents),
    tax_total: toMoney(taxCents),
    line_total: toMoney(lineTotalCents),
    metadata: {
      ...(input.metadata || {}),
      productSnapshot: {
        sku: product.sku,
        name: product.name
      }
    },
    subtotalCents: grossCents,
    discountCents,
    taxCents,
    lineTotalCents
  };
}

function calculateTotals(items) {
  return {
    subtotal: toMoney(items.reduce((total, item) => total + item.subtotalCents, 0)),
    discount_total: toMoney(items.reduce((total, item) => total + item.discountCents, 0)),
    tax_total: toMoney(items.reduce((total, item) => total + item.taxCents, 0)),
    grand_total: toMoney(items.reduce((total, item) => total + item.lineTotalCents, 0))
  };
}

function generateInvoiceNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  return `I-${date}-${suffix}`;
}

function mapCustomer(row) {
  return {
    id: row.customer_id,
    relationshipId: row.vendor_customer_relationship_id,
    accountCode: row.customer_account_code,
    relationshipStatus: row.customer_relationship_status,
    fullName: row.customer_full_name,
    companyName: row.customer_company_name,
    email: row.customer_email,
    phone: row.customer_phone
  };
}

function mapInvoice(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    vendorCustomerRelationshipId: row.vendor_customer_relationship_id,
    orderId: row.order_id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    taxTotal: row.tax_total,
    grandTotal: row.grand_total,
    balanceDue: row.balance_due,
    notes: row.notes,
    createdBy: row.created_by,
    customer: mapCustomer(row),
    order: row.order_id
      ? {
          id: row.order_id,
          orderNumber: row.order_number,
          status: row.order_status
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapInvoiceItem(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    productId: row.product_id,
    sequenceNumber: row.sequence_number,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    discountTotal: row.discount_total,
    taxTotal: row.tax_total,
    lineTotal: row.line_total,
    metadata: row.metadata || {},
    product: row.product_id
      ? {
          id: row.product_id,
          sku: row.product_sku,
          name: row.product_name,
          status: row.product_status
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function notifyInvoiceEvent(vendorId, detail, content) {
  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: content.eventCode,
      title: content.title,
      message: content.message(detail),
      relatedEntityType: "invoice",
      relatedEntityId: detail.id,
      metadata: {
        invoiceId: detail.id,
        invoiceNumber: detail.invoiceNumber,
        status: detail.status,
        customerId: detail.customerId,
        orderId: detail.orderId,
        grandTotal: detail.grandTotal,
        balanceDue: detail.balanceDue
      }
    })
  );
}

function notifyOrderConvertedToInvoice(vendorId, detail) {
  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: "order.converted_to_invoice",
      title: "Order converted to invoice",
      message: `Order ${detail.order?.orderNumber || detail.orderId} was converted to invoice ${detail.invoiceNumber}.`,
      relatedEntityType: "order",
      relatedEntityId: detail.orderId,
      metadata: {
        orderId: detail.orderId,
        orderNumber: detail.order?.orderNumber,
        invoiceId: detail.id,
        invoiceNumber: detail.invoiceNumber,
        customerId: detail.customerId,
        grandTotal: detail.grandTotal,
        balanceDue: detail.balanceDue
      }
    })
  );
}

function assertInvoiceFound(row, invoiceId) {
  if (!row) {
    throw new AppError("Invoice not found for this vendor", {
      statusCode: 404,
      code: "INVOICE_NOT_FOUND",
      details: [
        {
          path: "invoiceId",
          message: `No invoice was found for ${invoiceId}`
        }
      ]
    });
  }
}

function assertInvoiceEditable(row, payload) {
  const editableFields = EDITABLE_FIELDS_BY_STATUS[row.status] || [];

  if (editableFields.length === 0) {
    throw new AppError("This invoice is not editable", {
      statusCode: 409,
      code: "INVOICE_NOT_EDITABLE",
      details: [
        {
          path: "status",
          message: "Paid and void invoices cannot be updated"
        }
      ]
    });
  }

  const disallowedFields = Object.keys(payload).filter((field) => !editableFields.includes(field));

  if (disallowedFields.length > 0) {
    throw new AppError("One or more invoice fields are not editable in the current status", {
      statusCode: 409,
      code: "INVOICE_FIELDS_NOT_EDITABLE",
      details: disallowedFields.map((field) => ({
        path: field,
        message: `Field ${field} cannot be updated while invoice status is ${row.status}`
      }))
    });
  }
}

function assertInvoiceTransition(row, action) {
  const transition = INVOICE_TRANSITIONS[action];

  if (!transition) {
    throw new AppError("Unsupported invoice action", {
      statusCode: 400,
      code: "UNSUPPORTED_INVOICE_ACTION"
    });
  }

  if (!transition.from.includes(row.status)) {
    throw new AppError("Invalid invoice status transition", {
      statusCode: 409,
      code: "INVALID_INVOICE_TRANSITION",
      details: [
        {
          path: "status",
          message: `Invoice cannot transition from ${row.status} to ${transition.to}`
        }
      ]
    });
  }

  return transition;
}

async function assertCustomerLinkedToVendor(vendorId, customerId) {
  const relationship = await findCustomerRelationshipForVendor(vendorId, customerId);

  if (!relationship) {
    throw new AppError("Customer is not linked to this vendor", {
      statusCode: 422,
      code: "CUSTOMER_NOT_AVAILABLE",
      details: [
        {
          path: "customerId",
          message: "Invoices can only use customers linked to the current vendor"
        }
      ]
    });
  }

  return relationship;
}

async function buildInvoiceItems(vendorId, inputItems) {
  const uniqueProductIds = [...new Set(inputItems.map((item) => item.productId ?? item.product_id))];
  const products = await listProductsByIdsForVendor(vendorId, uniqueProductIds);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const missingProductIds = uniqueProductIds.filter((productId) => !productsById.has(productId));

  if (missingProductIds.length > 0) {
    throw new AppError("One or more products are not available for this vendor", {
      statusCode: 422,
      code: "PRODUCT_NOT_AVAILABLE",
      details: missingProductIds.map((productId) => ({
        path: "items.productId",
        message: `Product ${productId} is not available for the current vendor`
      }))
    });
  }

  return inputItems.map((item, index) =>
    calculateLineItem(
      {
        ...item,
        productId: item.productId ?? item.product_id
      },
      productsById.get(item.productId ?? item.product_id),
      index
    )
  );
}

async function resolveInvoiceCreationSource(vendorId, payload) {
  if (!payload.orderId) {
    return {
      customerId: payload.customerId,
      relationship: await assertCustomerLinkedToVendor(vendorId, payload.customerId),
      items: payload.items,
      order: null
    };
  }

  const order = await findOrderForVendor(vendorId, payload.orderId);

  if (!order) {
    throw new AppError("Order not found for this vendor", {
      statusCode: 422,
      code: "ORDER_NOT_AVAILABLE",
      details: [
        {
          path: "orderId",
          message: "Invoices can only be created from orders in the current vendor"
        }
      ]
    });
  }

  assertOrderInvoiceable(order);
  await assertNoExistingInvoiceForOrder(vendorId, payload.orderId);

  if (payload.customerId && payload.customerId !== order.customer_id) {
    throw new AppError("Order customer does not match the requested customer", {
      statusCode: 422,
      code: "ORDER_CUSTOMER_MISMATCH",
      details: [
        {
          path: "customerId",
          message: "When orderId is provided, customerId must match the order customer"
        }
      ]
    });
  }

  const relationship = await assertCustomerLinkedToVendor(vendorId, order.customer_id);
  const orderItems = await listOrderItemsForInvoice(vendorId, payload.orderId);

  if (orderItems.length === 0) {
    throw new AppError("Order has no line items to invoice", {
      statusCode: 422,
      code: "ORDER_ITEMS_REQUIRED"
    });
  }

  return {
    customerId: order.customer_id,
    relationship,
    items: orderItems,
    order
  };
}

function assertOrderInvoiceable(order) {
  if (!INVOICEABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError("Order is not eligible for invoice conversion", {
      statusCode: 409,
      code: "ORDER_NOT_INVOICEABLE",
      details: [
        {
          path: "status",
          message: "Only confirmed, packed, dispatched, or delivered orders can be invoiced"
        }
      ]
    });
  }
}

async function assertNoExistingInvoiceForOrder(vendorId, orderId) {
  const existing = await listInvoicesForVendor({
    vendorId,
    orderId,
    limit: 1,
    offset: 0
  });

  if (existing.total > 0) {
    throw new AppError("An invoice already exists for this order", {
      statusCode: 409,
      code: "INVOICE_ALREADY_EXISTS_FOR_ORDER",
      details: [
        {
          path: "orderId",
          message: "Use the existing invoice instead of invoicing this order again"
        }
      ]
    });
  }
}

async function getInvoiceDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listInvoicesForVendor({
    vendorId,
    status: query.status || null,
    customerId: query.customerId || null,
    orderId: query.orderId || null,
    invoiceNumber: query.invoiceNumber || null,
    search: query.search || null,
    issueDateFrom: query.issueDateFrom || null,
    issueDateTo: query.issueDateTo || null,
    dueDateFrom: query.dueDateFrom || null,
    dueDateTo: query.dueDateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapInvoice),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      status: query.status || null,
      customerId: query.customerId || null,
      orderId: query.orderId || null,
      invoiceNumber: query.invoiceNumber || null,
      search: query.search || null,
      issueDateFrom: query.issueDateFrom || null,
      issueDateTo: query.issueDateTo || null,
      dueDateFrom: query.dueDateFrom || null,
      dueDateTo: query.dueDateTo || null
    }
  };
}

async function getInvoiceDetail(vendorId, invoiceId) {
  const invoice = await findInvoiceForVendor(vendorId, invoiceId);

  assertInvoiceFound(invoice, invoiceId);

  const items = await listInvoiceItemsForVendor(vendorId, invoiceId);

  return {
    ...mapInvoice(invoice),
    items: items.map(mapInvoiceItem)
  };
}

async function createInvoice(vendorId, payload, actor) {
  const source = await resolveInvoiceCreationSource(vendorId, payload);
  const items = await buildInvoiceItems(vendorId, source.items);
  const totals = calculateTotals(items);
  const status = payload.status || "draft";
  const invoice = await createInvoiceWithItems({
    invoice: {
      vendor_id: vendorId,
      customer_id: source.customerId,
      vendor_customer_relationship_id: source.relationship.id,
      order_id: payload.orderId || null,
      invoice_number: payload.invoiceNumber || generateInvoiceNumber(),
      status,
      issue_date: payload.issueDate || null,
      due_date: payload.dueDate || null,
      notes: payload.notes || source.order?.notes || null,
      balance_due: calculateBalanceDue(status, totals.grand_total),
      created_by: actor.userId,
      ...totals
    },
    items
  });

  if (!["draft", "void"].includes(status)) {
    await ensureInvoiceLedgerEntry(vendorId, invoice.id, actor.userId);
  }

  const detail = await getInvoiceDetail(vendorId, invoice.id);

  if (detail.status === "issued") {
    notifyInvoiceEvent(vendorId, detail, INVOICE_EVENT_CONTENT.issued);
  }

  if (detail.orderId) {
    notifyOrderConvertedToInvoice(vendorId, detail);
  }

  return detail;
}

async function convertOrderToInvoice(vendorId, orderId, actor) {
  const order = await findOrderForVendor(vendorId, orderId);

  if (!order) {
    throw new AppError("Order not found for this vendor", {
      statusCode: 404,
      code: "ORDER_NOT_FOUND",
      details: [
        {
          path: "orderId",
          message: `No order was found for ${orderId}`
        }
      ]
    });
  }

  assertOrderInvoiceable(order);
  await assertNoExistingInvoiceForOrder(vendorId, orderId);

  return createInvoice(
    vendorId,
    {
      orderId,
      status: "issued"
    },
    actor
  );
}

async function updateInvoice(vendorId, invoiceId, payload) {
  const existing = await findInvoiceForVendor(vendorId, invoiceId);

  assertInvoiceFound(existing, invoiceId);
  assertInvoiceEditable(existing, payload);

  const headerUpdates = {
    ...toColumnPayload(payload, HEADER_FIELDS)
  };

  const updated = await updateInvoiceWithOptionalItems({
    vendorId,
    invoiceId,
    invoiceUpdates: headerUpdates
  });

  assertInvoiceFound(updated, invoiceId);

  return getInvoiceDetail(vendorId, invoiceId);
}

async function transitionInvoice(vendorId, invoiceId, action, actor = {}) {
  const existing = await findInvoiceForVendor(vendorId, invoiceId);

  assertInvoiceFound(existing, invoiceId);

  const transition = assertInvoiceTransition(existing, action);
  const invoiceUpdates = {
    status: transition.to,
    balance_due: calculateBalanceDue(transition.to, Number(existing.grand_total))
  };
  const updated = await updateInvoiceWithOptionalItems({
    vendorId,
    invoiceId,
    invoiceUpdates
  });

  assertInvoiceFound(updated, invoiceId);

  if (transition.to === "issued") {
    await ensureInvoiceLedgerEntry(vendorId, invoiceId, actor.userId);
  }

  if (transition.to === "void") {
    await voidInvoiceLedgerEntry(vendorId, invoiceId, actor.userId);
  }

  const detail = await getInvoiceDetail(vendorId, invoiceId);

  const content = INVOICE_EVENT_CONTENT[transition.to];

  if (content) {
    notifyInvoiceEvent(vendorId, detail, content);
  }

  return detail;
}

export {
  convertOrderToInvoice,
  createInvoice,
  getInvoiceDetail,
  getInvoiceDirectory,
  transitionInvoice,
  updateInvoice
};
