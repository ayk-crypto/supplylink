import AppError from "../../core/errors/AppError.js";
import env from "../../config/env.js";
import {
  createOrderOutboundStockMovements,
  createStockMovementAndUpdateProduct,
  findInventoryProductForVendor,
  hasStockMovementForReference,
  listInventoryProductsForVendor,
  listOrderProductQuantities,
  listStockMovementsForVendor,
  reverseOrderOutboundStockMovements
} from "./inventory.repository.js";
import { recordAuditEvent } from "../audit/audit.service.js";

function toNumber(value) {
  return Number(value || 0);
}

function paginationMeta(query, total) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  return {
    page,
    pageSize,
    totalItems: total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    unitPrice: row.unit_price,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    isLowStock: Number(row.stock_quantity || 0) <= Number(row.low_stock_threshold || 0),
    status: row.status,
    metadata: row.metadata || {},
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMovement(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    productId: row.product_id,
    type: row.type,
    quantity: row.quantity,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    notes: row.notes,
    metadata: row.metadata || {},
    createdBy: row.created_by,
    product: {
      id: row.product_id,
      sku: row.product_sku,
      name: row.product_name
    },
    createdAt: row.created_at
  };
}

function assertProductFound(row, productId) {
  if (!row) {
    throw new AppError("Product not found for this vendor", {
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
      details: [
        {
          path: "productId",
          message: `No product was found for ${productId}`
        }
      ]
    });
  }
}

function stockDeltaForMovement(type, quantity) {
  if (type === "inbound") {
    return Math.abs(toNumber(quantity));
  }

  if (type === "outbound") {
    return -Math.abs(toNumber(quantity));
  }

  return toNumber(quantity);
}

async function getInventoryProductDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listInventoryProductsForVendor({
    vendorId,
    search: query.search || null,
    status: query.status || null,
    categoryId: query.categoryId || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapProduct),
    pagination: paginationMeta(query, result.total),
    filters: {
      status: query.status || null,
      categoryId: query.categoryId || null,
      search: query.search || null
    }
  };
}

async function getInventoryProductDetail(vendorId, productId) {
  const product = await findInventoryProductForVendor(vendorId, productId);

  assertProductFound(product, productId);

  return mapProduct(product);
}

async function getStockMovementDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listStockMovementsForVendor({
    vendorId,
    productId: query.productId || null,
    type: query.type || null,
    referenceType: query.referenceType || null,
    referenceId: query.referenceId || null,
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapMovement),
    pagination: paginationMeta(query, result.total),
    filters: {
      productId: query.productId || null,
      type: query.type || null,
      referenceType: query.referenceType || null,
      referenceId: query.referenceId || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null
    }
  };
}

async function adjustInventory(vendorId, payload, actor = {}) {
  const type = payload.type || "adjustment";
  const stockDelta = stockDeltaForMovement(type, payload.quantity);
  const movementQuantity = type === "adjustment" ? payload.quantity : Math.abs(toNumber(payload.quantity));
  const movement = await createStockMovementAndUpdateProduct({
    vendorId,
    productId: payload.productId,
    type,
    quantity: movementQuantity,
    stockDelta,
    referenceType: payload.referenceType || "manual",
    referenceId: payload.referenceId || null,
    notes: payload.notes || null,
    metadata: payload.metadata || {},
    createdBy: actor.userId || null
  });

  if (!movement) {
    throw new AppError("Product not found for this vendor", {
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
      details: [
        {
          path: "productId",
          message: "Stock can only be adjusted for products in the current vendor"
        }
      ]
    });
  }

  await recordAuditEvent({
    vendorId,
    actor,
    entityType: "product",
    entityId: payload.productId,
    eventType: "inventory.adjusted",
    eventLabel: `Inventory was adjusted for product ${payload.productId}.`,
    metadata: {
      productId: payload.productId,
      stockMovementId: movement.id,
      type,
      quantity: movementQuantity,
      stockDelta,
      referenceType: payload.referenceType || "manual",
      referenceId: payload.referenceId || null
    }
  });

  return getInventoryProductDetail(vendorId, payload.productId);
}

async function applyOutboundStockForOrder(vendorId, orderId, actor = {}) {
  const alreadyApplied = await hasStockMovementForReference(vendorId, "order", orderId);

  if (alreadyApplied) {
    return [];
  }

  const movements = await createOrderOutboundStockMovements({
    vendorId,
    orderId,
    createdBy: actor.userId || null
  });

  if (movements.length > 0) {
    await recordAuditEvent({
      vendorId,
      actor,
      entityType: "order",
      entityId: orderId,
      eventType: "order.stock_allocated",
      eventLabel: `Inventory was allocated for order ${orderId}.`,
      metadata: {
        orderId,
        movementIds: movements.map((movement) => movement.id),
        movementCount: movements.length,
        referenceType: "order"
      }
    });
  }

  return movements;
}

async function reverseOutboundStockForOrder(vendorId, orderId, actor = {}) {
  const movements = await reverseOrderOutboundStockMovements({
    vendorId,
    orderId,
    createdBy: actor.userId || null
  });

  if (movements.length > 0) {
    await recordAuditEvent({
      vendorId,
      actor,
      entityType: "order",
      entityId: orderId,
      eventType: "inventory.order_reversal",
      eventLabel: `Inventory allocation was reversed for cancelled order ${orderId}.`,
      metadata: {
        orderId,
        movementIds: movements.map((movement) => movement.id),
        movementCount: movements.length,
        referenceType: "order_cancellation",
        reversesReferenceType: "order"
      }
    });
  }

  return movements;
}

async function assertSufficientStockForOrderItems(vendorId, items) {
  if (!env.ENFORCE_STOCK_AVAILABILITY) {
    return;
  }

  const requiredByProduct = new Map();

  items.forEach((item) => {
    const productId = item.product_id || item.productId;

    if (!productId) {
      return;
    }

    requiredByProduct.set(productId, toNumber(requiredByProduct.get(productId)) + toNumber(item.quantity));
  });

  const insufficient = [];

  for (const [productId, requiredQuantity] of requiredByProduct.entries()) {
    const product = await findInventoryProductForVendor(vendorId, productId);

    if (!product || toNumber(product.stock_quantity) < requiredQuantity) {
      insufficient.push({
        productId,
        available: product ? toNumber(product.stock_quantity) : 0,
        required: requiredQuantity
      });
    }
  }

  if (insufficient.length > 0) {
    throw new AppError("Insufficient stock for one or more order items", {
      statusCode: 409,
      code: "INSUFFICIENT_STOCK",
      details: insufficient.map((item) => ({
        path: "items",
        message: `Product ${item.productId} requires ${item.required} but only ${item.available} is available`
      }))
    });
  }
}

async function assertSufficientStockForOrder(vendorId, orderId) {
  if (!env.ENFORCE_STOCK_AVAILABILITY) {
    return;
  }

  const existingMovement = await hasStockMovementForReference(vendorId, "order", orderId);

  if (existingMovement) {
    return;
  }

  const items = await listOrderProductQuantities(vendorId, orderId);
  await assertSufficientStockForOrderItems(vendorId, items);
}

export {
  adjustInventory,
  applyOutboundStockForOrder,
  assertSufficientStockForOrder,
  assertSufficientStockForOrderItems,
  getInventoryProductDetail,
  getInventoryProductDirectory,
  getStockMovementDirectory,
  reverseOutboundStockForOrder
};
