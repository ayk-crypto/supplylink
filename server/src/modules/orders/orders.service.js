import { randomUUID } from "crypto";
import AppError from "../../core/errors/AppError.js";
import {
  createOrderWithItems,
  findCustomerRelationshipForVendor,
  findOrderForVendor,
  findQuotationForVendor,
  listOrderItemsForVendor,
  listOrdersForVendor,
  listProductsByIdsForVendor,
  listQuotationItemsForOrder,
  updateOrderWithOptionalItems
} from "./orders.repository.js";
import { applyOutboundStockForOrder } from "../inventory/inventory.service.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";

const EDITABLE_FIELDS_BY_STATUS = {
  confirmed: ["requestedDeliveryDate", "deliveryDate", "notes"],
  dispatched: ["deliveryDate", "notes"],
  draft: ["orderDate", "requestedDeliveryDate", "deliveryDate", "notes"],
  packed: ["requestedDeliveryDate", "deliveryDate", "notes"]
};
const CONVERTIBLE_QUOTATION_STATUSES = ["accepted"];
const ORDER_TRANSITIONS = {
  cancel: { from: ["draft", "confirmed", "packed"], to: "cancelled" },
  confirm: { from: ["draft"], to: "confirmed" },
  deliver: { from: ["dispatched"], to: "delivered" },
  dispatch: { from: ["packed"], to: "dispatched" },
  pack: { from: ["confirmed"], to: "packed" }
};
const ORDER_EVENT_CONTENT = {
  cancelled: {
    eventCode: "order.cancelled",
    title: "Order cancelled",
    message: (detail) => `Order ${detail.orderNumber} was cancelled.`
  },
  confirmed: {
    eventCode: "order.confirmed",
    title: "Order confirmed",
    message: (detail) =>
      `Order ${detail.orderNumber} was confirmed for ${detail.customer.companyName || detail.customer.fullName}.`
  },
  delivered: {
    eventCode: "order.delivered",
    title: "Order delivered",
    message: (detail) => `Order ${detail.orderNumber} was marked as delivered.`
  },
  dispatched: {
    eventCode: "order.dispatched",
    title: "Order dispatched",
    message: (detail) => `Order ${detail.orderNumber} was dispatched.`
  },
  packed: {
    eventCode: "order.packed",
    title: "Order packed",
    message: (detail) => `Order ${detail.orderNumber} was packed.`
  }
};
const HEADER_FIELDS = {
  orderDate: "order_date",
  requestedDeliveryDate: "delivery_date",
  deliveryDate: "delivery_date",
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

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomUUID().slice(0, 8).toUpperCase();

  return `O-${date}-${suffix}`;
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

function mapOrder(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    vendorCustomerRelationshipId: row.vendor_customer_relationship_id,
    quotationId: row.quotation_id,
    orderNumber: row.order_number,
    status: row.status,
    orderDate: row.order_date,
    requestedDeliveryDate: row.delivery_date,
    deliveryDate: row.delivery_date,
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    taxTotal: row.tax_total,
    grandTotal: row.grand_total,
    notes: row.notes,
    createdBy: row.created_by,
    customer: mapCustomer(row),
    quotation: row.quotation_id
      ? {
          id: row.quotation_id,
          quoteNumber: row.quotation_quote_number,
          status: row.quotation_status
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOrderItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
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

function notifyOrderEvent(vendorId, detail, content) {
  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: content.eventCode,
      title: content.title,
      message: content.message(detail),
      relatedEntityType: "order",
      relatedEntityId: detail.id,
      metadata: {
        orderId: detail.id,
        orderNumber: detail.orderNumber,
        status: detail.status,
        customerId: detail.customerId,
        quotationId: detail.quotationId,
        grandTotal: detail.grandTotal
      }
    })
  );
}

function notifyQuotationConvertedToOrder(vendorId, detail) {
  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: "quotation.converted_to_order",
      title: "Quotation converted to order",
      message: `Quotation ${detail.quotation?.quoteNumber || detail.quotationId} was converted to order ${detail.orderNumber}.`,
      relatedEntityType: "quotation",
      relatedEntityId: detail.quotationId,
      metadata: {
        quotationId: detail.quotationId,
        quoteNumber: detail.quotation?.quoteNumber,
        orderId: detail.id,
        orderNumber: detail.orderNumber,
        customerId: detail.customerId,
        grandTotal: detail.grandTotal
      }
    })
  );
}

function assertOrderFound(row, orderId) {
  if (!row) {
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
}

function assertOrderEditable(row, payload) {
  const editableFields = EDITABLE_FIELDS_BY_STATUS[row.status] || [];

  if (editableFields.length === 0) {
    throw new AppError("This order is not editable", {
      statusCode: 409,
      code: "ORDER_NOT_EDITABLE",
      details: [
        {
          path: "status",
          message: "Delivered and cancelled orders cannot be updated"
        }
      ]
    });
  }

  const disallowedFields = Object.keys(payload).filter((field) => !editableFields.includes(field));

  if (disallowedFields.length > 0) {
    throw new AppError("One or more order fields are not editable in the current status", {
      statusCode: 409,
      code: "ORDER_FIELDS_NOT_EDITABLE",
      details: disallowedFields.map((field) => ({
        path: field,
        message: `Field ${field} cannot be updated while order status is ${row.status}`
      }))
    });
  }
}

function assertOrderTransition(row, action) {
  const transition = ORDER_TRANSITIONS[action];

  if (!transition) {
    throw new AppError("Unsupported order action", {
      statusCode: 400,
      code: "UNSUPPORTED_ORDER_ACTION"
    });
  }

  if (!transition.from.includes(row.status)) {
    throw new AppError("Invalid order status transition", {
      statusCode: 409,
      code: "INVALID_ORDER_TRANSITION",
      details: [
        {
          path: "status",
          message: `Order cannot transition from ${row.status} to ${transition.to}`
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
          message: "Orders can only use customers linked to the current vendor"
        }
      ]
    });
  }

  return relationship;
}

async function buildOrderItems(vendorId, inputItems) {
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

async function resolveOrderCreationSource(vendorId, payload) {
  if (!payload.quotationId) {
    return {
      customerId: payload.customerId,
      relationship: await assertCustomerLinkedToVendor(vendorId, payload.customerId),
      items: payload.items,
      quotation: null
    };
  }

  const quotation = await findQuotationForVendor(vendorId, payload.quotationId);

  if (!quotation) {
    throw new AppError("Quotation not found for this vendor", {
      statusCode: 422,
      code: "QUOTATION_NOT_AVAILABLE",
      details: [
        {
          path: "quotationId",
          message: "Orders can only be created from quotations in the current vendor"
        }
      ]
    });
  }

  assertQuotationConvertible(quotation);
  await assertNoExistingOrderForQuotation(vendorId, payload.quotationId);

  if (payload.customerId && payload.customerId !== quotation.customer_id) {
    throw new AppError("Quotation customer does not match the requested customer", {
      statusCode: 422,
      code: "QUOTATION_CUSTOMER_MISMATCH",
      details: [
        {
          path: "customerId",
          message: "When quotationId is provided, customerId must match the quotation customer"
        }
      ]
    });
  }

  const relationship = await assertCustomerLinkedToVendor(vendorId, quotation.customer_id);
  const quotationItems = await listQuotationItemsForOrder(vendorId, payload.quotationId);

  if (quotationItems.length === 0) {
    throw new AppError("Quotation has no line items to convert", {
      statusCode: 422,
      code: "QUOTATION_ITEMS_REQUIRED"
    });
  }

  return {
    customerId: quotation.customer_id,
    relationship,
    items: quotationItems,
    quotation
  };
}

function assertQuotationConvertible(quotation) {
  if (!CONVERTIBLE_QUOTATION_STATUSES.includes(quotation.status)) {
    throw new AppError("Quotation is not eligible for order conversion", {
      statusCode: 409,
      code: "QUOTATION_NOT_CONVERTIBLE",
      details: [
        {
          path: "status",
          message: "Only accepted quotations can be converted to orders"
        }
      ]
    });
  }
}

async function assertNoExistingOrderForQuotation(vendorId, quotationId) {
  const existing = await listOrdersForVendor({
    vendorId,
    quotationId,
    limit: 1,
    offset: 0
  });

  if (existing.total > 0) {
    throw new AppError("An order already exists for this quotation", {
      statusCode: 409,
      code: "ORDER_ALREADY_EXISTS_FOR_QUOTATION",
      details: [
        {
          path: "quotationId",
          message: "Use the existing order instead of converting this quotation again"
        }
      ]
    });
  }
}

async function getOrderDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listOrdersForVendor({
    vendorId,
    status: query.status || null,
    customerId: query.customerId || null,
    quotationId: query.quotationId || null,
    orderNumber: query.orderNumber || null,
    search: query.search || null,
    orderDateFrom: query.orderDateFrom || null,
    orderDateTo: query.orderDateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapOrder),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      status: query.status || null,
      customerId: query.customerId || null,
      quotationId: query.quotationId || null,
      orderNumber: query.orderNumber || null,
      search: query.search || null,
      orderDateFrom: query.orderDateFrom || null,
      orderDateTo: query.orderDateTo || null
    }
  };
}

async function getOrderDetail(vendorId, orderId) {
  const order = await findOrderForVendor(vendorId, orderId);

  assertOrderFound(order, orderId);

  const items = await listOrderItemsForVendor(vendorId, orderId);

  return {
    ...mapOrder(order),
    items: items.map(mapOrderItem)
  };
}

async function createOrder(vendorId, payload, actor) {
  const source = await resolveOrderCreationSource(vendorId, payload);
  const items = await buildOrderItems(vendorId, source.items);
  const totals = calculateTotals(items);
  const order = await createOrderWithItems({
    order: {
      vendor_id: vendorId,
      customer_id: source.customerId,
      vendor_customer_relationship_id: source.relationship.id,
      quotation_id: payload.quotationId || null,
      order_number: payload.orderNumber || generateOrderNumber(),
      status: payload.status || "draft",
      order_date: payload.orderDate || null,
      delivery_date: payload.requestedDeliveryDate || payload.deliveryDate || null,
      notes: payload.notes || source.quotation?.notes || null,
      created_by: actor.userId,
      ...totals
    },
    items
  });

  const detail = await getOrderDetail(vendorId, order.id);

  if (detail.status === "confirmed") {
    await applyOutboundStockForOrder(vendorId, detail.id, actor);
    notifyOrderEvent(vendorId, detail, ORDER_EVENT_CONTENT.confirmed);
  }

  if (detail.quotationId) {
    notifyQuotationConvertedToOrder(vendorId, detail);
  }

  return detail;
}

async function convertQuotationToOrder(vendorId, quotationId, actor) {
  const quotation = await findQuotationForVendor(vendorId, quotationId);

  if (!quotation) {
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

  assertQuotationConvertible(quotation);
  await assertNoExistingOrderForQuotation(vendorId, quotationId);

  return createOrder(
    vendorId,
    {
      quotationId,
      status: "confirmed"
    },
    actor
  );
}

async function updateOrder(vendorId, orderId, payload) {
  const existing = await findOrderForVendor(vendorId, orderId);

  assertOrderFound(existing, orderId);
  assertOrderEditable(existing, payload);

  const headerUpdates = {
    ...toColumnPayload(payload, HEADER_FIELDS)
  };

  const updated = await updateOrderWithOptionalItems({
    vendorId,
    orderId,
    orderUpdates: headerUpdates
  });

  assertOrderFound(updated, orderId);

  const detail = await getOrderDetail(vendorId, orderId);

  return detail;
}

async function transitionOrder(vendorId, orderId, action, actor = {}) {
  const existing = await findOrderForVendor(vendorId, orderId);

  assertOrderFound(existing, orderId);

  const transition = assertOrderTransition(existing, action);
  const updated = await updateOrderWithOptionalItems({
    vendorId,
    orderId,
    orderUpdates: {
      status: transition.to
    }
  });

  assertOrderFound(updated, orderId);

  const detail = await getOrderDetail(vendorId, orderId);

  if (["confirmed", "delivered"].includes(transition.to)) {
    await applyOutboundStockForOrder(vendorId, detail.id, actor);
  }

  const content = ORDER_EVENT_CONTENT[transition.to];

  if (content) {
    notifyOrderEvent(vendorId, detail, content);
  }

  return detail;
}

export {
  convertQuotationToOrder,
  createOrder,
  getOrderDetail,
  getOrderDirectory,
  transitionOrder,
  updateOrder
};
