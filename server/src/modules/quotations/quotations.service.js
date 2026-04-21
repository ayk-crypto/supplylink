import { randomUUID } from "crypto";
import AppError from "../../core/errors/AppError.js";
import { calculateDocumentPricing, toCents, toMoney, toNumber } from "../shared/pricing.js";
import {
  createQuotationWithItems,
  findCustomerRelationshipForVendor,
  findQuotationForVendor,
  listProductsByIdsForVendor,
  listQuotationItemsForVendor,
  listQuotationsForVendor,
  updateQuotationWithOptionalItems
} from "./quotations.repository.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";
import { recordAuditEvent } from "../audit/audit.service.js";

const EDITABLE_FIELDS_BY_STATUS = {
  draft: ["issueDate", "expiryDate", "notes"],
  sent: ["expiryDate", "notes"]
};
const QUOTATION_TRANSITIONS = {
  accept: { from: ["sent"], to: "accepted" },
  expire: { from: ["sent"], to: "expired" },
  reject: { from: ["sent"], to: "rejected" },
  send: { from: ["draft"], to: "sent" }
};
const QUOTATION_EVENT_CONTENT = {
  accepted: {
    eventCode: "quotation.accepted",
    title: "Quotation accepted",
    message: (detail) => `Quotation ${detail.quoteNumber} was accepted.`
  },
  expired: {
    eventCode: "quotation.expired",
    title: "Quotation expired",
    message: (detail) => `Quotation ${detail.quoteNumber} was marked as expired.`
  },
  rejected: {
    eventCode: "quotation.rejected",
    title: "Quotation rejected",
    message: (detail) => `Quotation ${detail.quoteNumber} was rejected.`
  },
  sent: {
    eventCode: "quotation.sent",
    title: "Quotation sent",
    message: (detail) => `Quotation ${detail.quoteNumber} was marked as sent.`
  }
};
const HEADER_FIELDS = {
  issueDate: "issue_date",
  expiryDate: "expiry_date",
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

function calculateLineItem(input, product, index) {
  const quantity = toNumber(input.quantity);
  const unitPrice = Object.prototype.hasOwnProperty.call(input, "unitPrice")
    ? toNumber(input.unitPrice)
    : toNumber(product.unit_price);
  const grossCents = Math.round(quantity * unitPrice * 100);
  const discountCents = toCents(input.discountTotal ?? input.discount ?? 0);
  const taxCents = toCents(input.taxTotal ?? input.tax ?? 0);
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

function generateQuoteNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  return `Q-${date}-${suffix}`;
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

function mapQuotation(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    vendorCustomerRelationshipId: row.vendor_customer_relationship_id,
    quoteNumber: row.quote_number,
    status: row.status,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value || 0),
    discountAmount: Number(row.discount_amount || 0),
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    taxEnabled: row.tax_enabled,
    taxRate: Number(row.tax_rate || 0),
    taxAmount: Number(row.tax_amount || 0),
    taxTotal: row.tax_total,
    grandTotal: row.grand_total,
    notes: row.notes,
    createdBy: row.created_by,
    customer: mapCustomer(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapQuotationItem(row) {
  return {
    id: row.id,
    quotationId: row.quotation_id,
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

function notifyQuotationEvent(vendorId, detail, content) {
  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: content.eventCode,
      title: content.title,
      message: content.message(detail),
      relatedEntityType: "quotation",
      relatedEntityId: detail.id,
      metadata: {
        quotationId: detail.id,
        quoteNumber: detail.quoteNumber,
        status: detail.status,
        customerId: detail.customerId
      }
    })
  );
}

function assertQuotationFound(row, quotationId) {
  if (!row) {
    throw new AppError("Quotation not found for this vendor", {
      statusCode: 404,
      code: "QUOTATION_NOT_FOUND",
      details: [
        {
          path: "quotationId",
          message: `No quotation was found for ${quotationId}`
        }
      ]
    });
  }
}

function assertQuotationEditable(row, payload) {
  const editableFields = EDITABLE_FIELDS_BY_STATUS[row.status] || [];

  if (editableFields.length === 0) {
    throw new AppError("This quotation is not editable", {
      statusCode: 409,
      code: "QUOTATION_NOT_EDITABLE",
      details: [
        {
          path: "status",
          message: "Accepted, rejected, and expired quotations cannot be updated"
        }
      ]
    });
  }

  const disallowedFields = Object.keys(payload).filter((field) => !editableFields.includes(field));

  if (disallowedFields.length > 0) {
    throw new AppError("One or more quotation fields are not editable in the current status", {
      statusCode: 409,
      code: "QUOTATION_FIELDS_NOT_EDITABLE",
      details: disallowedFields.map((field) => ({
        path: field,
        message: `Field ${field} cannot be updated while quotation status is ${row.status}`
      }))
    });
  }
}

function assertQuotationTransition(row, action) {
  const transition = QUOTATION_TRANSITIONS[action];

  if (!transition) {
    throw new AppError("Unsupported quotation action", {
      statusCode: 400,
      code: "UNSUPPORTED_QUOTATION_ACTION"
    });
  }

  if (!transition.from.includes(row.status)) {
    throw new AppError("Invalid quotation status transition", {
      statusCode: 409,
      code: "INVALID_QUOTATION_TRANSITION",
      details: [
        {
          path: "status",
          message: `Quotation cannot transition from ${row.status} to ${transition.to}`
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
          message: "Quotations can only use customers linked to the current vendor"
        }
      ]
    });
  }

  return relationship;
}

async function buildQuotationItems(vendorId, inputItems) {
  const uniqueProductIds = [...new Set(inputItems.map((item) => item.productId))];
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

  return inputItems.map((item, index) => calculateLineItem(item, productsById.get(item.productId), index));
}

async function getQuotationDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listQuotationsForVendor({
    vendorId,
    status: query.status || null,
    customerId: query.customerId || null,
    quoteNumber: query.quoteNumber || null,
    search: query.search || null,
    issueDateFrom: query.issueDateFrom || null,
    issueDateTo: query.issueDateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapQuotation),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      status: query.status || null,
      customerId: query.customerId || null,
      quoteNumber: query.quoteNumber || null,
      search: query.search || null,
      issueDateFrom: query.issueDateFrom || null,
      issueDateTo: query.issueDateTo || null
    }
  };
}

async function getQuotationDetail(vendorId, quotationId) {
  const quotation = await findQuotationForVendor(vendorId, quotationId);

  assertQuotationFound(quotation, quotationId);

  const items = await listQuotationItemsForVendor(vendorId, quotationId);

  return {
    ...mapQuotation(quotation),
    items: items.map(mapQuotationItem)
  };
}

async function createQuotation(vendorId, payload, actor) {
  const relationship = await assertCustomerLinkedToVendor(vendorId, payload.customerId);
  const items = await buildQuotationItems(vendorId, payload.items);
  const pricing = calculateDocumentPricing({
    items,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    taxEnabled: payload.taxEnabled,
    taxRate: payload.taxRate
  });
  const quotation = await createQuotationWithItems({
    quotation: {
      vendor_id: vendorId,
      customer_id: payload.customerId,
      vendor_customer_relationship_id: relationship.id,
      quote_number: payload.quoteNumber || generateQuoteNumber(),
      status: payload.status || "draft",
      issue_date: payload.issueDate || null,
      expiry_date: payload.expiryDate || null,
      discount_type: pricing.discountType,
      discount_value: pricing.discountValue,
      discount_amount: pricing.discountAmount,
      tax_enabled: pricing.taxEnabled,
      tax_rate: pricing.taxRate,
      tax_amount: pricing.taxAmount,
      notes: payload.notes || null,
      created_by: actor.userId,
      subtotal: pricing.subtotal,
      discount_total: pricing.discountTotal,
      tax_total: pricing.taxTotal,
      grand_total: pricing.grandTotal
    },
    items
  });

  const detail = await getQuotationDetail(vendorId, quotation.id);

  notifyQuotationEvent(vendorId, detail, {
    eventCode: "quotation.created",
    title: "Quotation created",
    message: (quotationDetail) =>
      `Quotation ${quotationDetail.quoteNumber} was created for ${quotationDetail.customer.companyName || quotationDetail.customer.fullName}.`
  });

  await recordAuditEvent({
    vendorId,
    actor,
    entityType: "quotation",
    entityId: detail.id,
    eventType: "quotation.created",
    eventLabel: `Quotation ${detail.quoteNumber} was created.`,
    metadata: {
      quotationId: detail.id,
      quoteNumber: detail.quoteNumber,
      status: detail.status,
      customerId: detail.customerId,
      grandTotal: detail.grandTotal
    }
  });

  return detail;
}

async function updateQuotation(vendorId, quotationId, payload) {
  const existing = await findQuotationForVendor(vendorId, quotationId);

  assertQuotationFound(existing, quotationId);
  assertQuotationEditable(existing, payload);

  const headerUpdates = {
    ...toColumnPayload(payload, HEADER_FIELDS)
  };

  const updated = await updateQuotationWithOptionalItems({
    vendorId,
    quotationId,
    quotationUpdates: headerUpdates
  });

  assertQuotationFound(updated, quotationId);

  const detail = await getQuotationDetail(vendorId, quotationId);

  return detail;
}

async function transitionQuotation(vendorId, quotationId, action, actor = {}) {
  const existing = await findQuotationForVendor(vendorId, quotationId);

  assertQuotationFound(existing, quotationId);

  const transition = assertQuotationTransition(existing, action);
  const updated = await updateQuotationWithOptionalItems({
    vendorId,
    quotationId,
    quotationUpdates: {
      status: transition.to
    }
  });

  assertQuotationFound(updated, quotationId);

  const detail = await getQuotationDetail(vendorId, quotationId);

  const content = QUOTATION_EVENT_CONTENT[transition.to];

  if (content) {
    notifyQuotationEvent(vendorId, detail, content);
  }

  await recordAuditEvent({
    vendorId,
    actor,
    entityType: "quotation",
    entityId: detail.id,
    eventType: content?.eventCode || `quotation.${transition.to}`,
    eventLabel: content?.message(detail) || `Quotation ${detail.quoteNumber} changed to ${transition.to}.`,
    metadata: {
      quotationId: detail.id,
      quoteNumber: detail.quoteNumber,
      previousStatus: existing.status,
      status: detail.status,
      action,
      customerId: detail.customerId
    }
  });

  return detail;
}

export {
  createQuotation,
  getQuotationDetail,
  getQuotationDirectory,
  transitionQuotation,
  updateQuotation
};
