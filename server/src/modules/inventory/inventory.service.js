import AppError from "../../core/errors/AppError.js";
import {
  createOrderOutboundStockMovements,
  createStockMovementAndUpdateProduct,
  findInventoryProductForVendor,
  hasStockMovementForReference,
  listInventoryProductsForVendor,
  listStockMovementsForVendor
} from "./inventory.repository.js";

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

  return getInventoryProductDetail(vendorId, payload.productId);
}

async function applyOutboundStockForOrder(vendorId, orderId, actor = {}) {
  const alreadyApplied = await hasStockMovementForReference(vendorId, "order", orderId);

  if (alreadyApplied) {
    return [];
  }

  return createOrderOutboundStockMovements({
    vendorId,
    orderId,
    createdBy: actor.userId || null
  });
}

export {
  adjustInventory,
  applyOutboundStockForOrder,
  getInventoryProductDetail,
  getInventoryProductDirectory,
  getStockMovementDirectory
};
