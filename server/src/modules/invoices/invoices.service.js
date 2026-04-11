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
import { ensureInvoiceLedgerEntry } from "../ledger/ledger.repository.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";

const TERMINAL_STATUSES = ["paid", "void"];
const ITEM_EDITABLE_STATUSES = ["draft"];
const HEADER_FIELDS = {
  customerId: "customer_id",
  invoiceNumber: "invoice_number",
  issueDate: "issue_date",
  dueDate: "due_date",
  status: "status",
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
  if (TERMINAL_STATUSES.includes(row.status)) {
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

  if (payload.items && !ITEM_EDITABLE_STATUSES.includes(row.status)) {
    throw new AppError("Invoice line items are no longer editable", {
      statusCode: 409,
      code: "INVOICE_ITEMS_NOT_EDITABLE",
      details: [
        {
          path: "items",
          message: "Invoice line items can only be replaced while an invoice is draft"
        }
      ]
    });
  }
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
  const orderItems = payload.items || (await listOrderItemsForInvoice(vendorId, payload.orderId));

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
    runNotificationTask(
      notifyVendorUsers({
        vendorId,
        eventCode: "invoice.issued",
        title: "Invoice issued",
        message: `Invoice ${detail.invoiceNumber} was issued for ${detail.customer.companyName || detail.customer.fullName}.`,
        metadata: {
          invoiceId: detail.id,
          invoiceNumber: detail.invoiceNumber,
          customerId: detail.customerId,
          grandTotal: detail.grandTotal,
          balanceDue: detail.balanceDue
        }
      })
    );
  }

  return detail;
}

async function updateInvoice(vendorId, invoiceId, payload) {
  const existing = await findInvoiceForVendor(vendorId, invoiceId);

  assertInvoiceFound(existing, invoiceId);
  assertInvoiceEditable(existing, payload);

  let relationshipId = existing.vendor_customer_relationship_id;
  let items = null;
  let totals = {};

  if (payload.customerId) {
    const relationship = await assertCustomerLinkedToVendor(vendorId, payload.customerId);
    relationshipId = relationship.id;
  }

  if (payload.items) {
    items = await buildInvoiceItems(vendorId, payload.items);
    totals = calculateTotals(items);
  }

  const nextGrandTotal = totals.grand_total ?? Number(existing.grand_total);
  const nextStatus = payload.status || existing.status;
  const headerUpdates = {
    ...toColumnPayload(payload, HEADER_FIELDS),
    vendor_customer_relationship_id: payload.customerId ? relationshipId : undefined,
    ...totals,
    balance_due: payload.items || payload.status ? calculateBalanceDue(nextStatus, nextGrandTotal) : undefined
  };

  const updated = await updateInvoiceWithOptionalItems({
    vendorId,
    invoiceId,
    invoiceUpdates: headerUpdates,
    items
  });

  assertInvoiceFound(updated, invoiceId);

  if (!["draft", "void"].includes(updated.status)) {
    await ensureInvoiceLedgerEntry(vendorId, invoiceId);
  }

  const detail = await getInvoiceDetail(vendorId, invoiceId);

  if (payload.status === "issued" && existing.status !== "issued") {
    runNotificationTask(
      notifyVendorUsers({
        vendorId,
        eventCode: "invoice.issued",
        title: "Invoice issued",
        message: `Invoice ${detail.invoiceNumber} was issued for ${detail.customer.companyName || detail.customer.fullName}.`,
        metadata: {
          invoiceId: detail.id,
          invoiceNumber: detail.invoiceNumber,
          customerId: detail.customerId,
          grandTotal: detail.grandTotal,
          balanceDue: detail.balanceDue
        }
      })
    );
  }

  return detail;
}

export { createInvoice, getInvoiceDetail, getInvoiceDirectory, updateInvoice };
