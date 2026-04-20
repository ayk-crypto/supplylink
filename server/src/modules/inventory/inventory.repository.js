import { query, withTransaction } from "../../config/db.js";

const PRODUCT_SELECT = `product.id,
                        product.vendor_id,
                        product.category_id,
                        product.sku,
                        product.name,
                        product.description,
                        product.unit_price,
                        product.stock_quantity,
                        product.status,
                        product.metadata,
                        product.created_at,
                        product.updated_at,
                        category.name AS category_name,
                        category.slug AS category_slug`;

const MOVEMENT_SELECT = `movement.id,
                         movement.vendor_id,
                         movement.product_id,
                         movement.type,
                         movement.quantity,
                         movement.reference_type,
                         movement.reference_id,
                         movement.notes,
                         movement.metadata,
                         movement.created_by,
                         movement.created_at,
                         product.sku AS product_sku,
                         product.name AS product_name`;

function productJoinClause() {
  return `FROM products product
          LEFT JOIN categories category
            ON category.id = product.category_id
           AND category.vendor_id = product.vendor_id`;
}

async function listInventoryProductsForVendor({
  vendorId,
  search = null,
  status = null,
  categoryId = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["product.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`product.status = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`product.category_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      product.name ILIKE $${values.length}
      OR product.sku ILIKE $${values.length}
      OR COALESCE(product.description, '') ILIKE $${values.length}
      OR COALESCE(category.name, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${productJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${PRODUCT_SELECT}
     ${productJoinClause()}
     ${whereClause}
     ORDER BY product.name ASC, product.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findInventoryProductForVendor(vendorId, productId, client = { query }) {
  const result = await client.query(
    `SELECT ${PRODUCT_SELECT}
     ${productJoinClause()}
     WHERE product.vendor_id = $1
       AND product.id = $2
     LIMIT 1`,
    [vendorId, productId]
  );

  return result.rows[0] || null;
}

async function listStockMovementsForVendor({
  vendorId,
  productId = null,
  type = null,
  referenceType = null,
  referenceId = null,
  dateFrom = null,
  dateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["movement.vendor_id = $1"];
  const values = [vendorId];

  if (productId) {
    values.push(productId);
    conditions.push(`movement.product_id = $${values.length}`);
  }

  if (type) {
    values.push(type);
    conditions.push(`movement.type = $${values.length}`);
  }

  if (referenceType) {
    values.push(referenceType);
    conditions.push(`movement.reference_type = $${values.length}`);
  }

  if (referenceId) {
    values.push(referenceId);
    conditions.push(`movement.reference_id = $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`movement.created_at::date >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(`movement.created_at::date <= $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM stock_movements movement
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${MOVEMENT_SELECT}
     FROM stock_movements movement
     INNER JOIN products product
       ON product.id = movement.product_id
      AND product.vendor_id = movement.vendor_id
     ${whereClause}
     ORDER BY movement.created_at DESC, movement.id DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function hasStockMovementForReference(vendorId, referenceType, referenceId) {
  const result = await query(
    `SELECT 1
     FROM stock_movements
     WHERE vendor_id = $1
       AND reference_type = $2
       AND reference_id = $3
     LIMIT 1`,
    [vendorId, referenceType, referenceId]
  );

  return Boolean(result.rows[0]);
}

async function createStockMovementAndUpdateProduct({
  vendorId,
  productId,
  type,
  quantity,
  stockDelta,
  referenceType = "manual",
  referenceId = null,
  notes = null,
  metadata = {},
  createdBy = null
}) {
  return withTransaction(async (client) => {
    const product = await findInventoryProductForVendor(vendorId, productId, client);

    if (!product) {
      return null;
    }

    await client.query(
      `UPDATE products
       SET stock_quantity = stock_quantity + $1,
           updated_at = NOW()
       WHERE vendor_id = $2
         AND id = $3`,
      [stockDelta, vendorId, productId]
    );

    const movementResult = await client.query(
      `INSERT INTO stock_movements (
         vendor_id,
         product_id,
         type,
         quantity,
         reference_type,
         reference_id,
         notes,
         metadata,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        vendorId,
        productId,
        type,
        quantity,
        referenceType,
        referenceId,
        notes,
        metadata,
        createdBy
      ]
    );

    return movementResult.rows[0] || null;
  });
}

async function createOrderOutboundStockMovements({ vendorId, orderId, createdBy = null }) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT 1
       FROM stock_movements
       WHERE vendor_id = $1
         AND reference_type = 'order'
         AND reference_id = $2
       LIMIT 1`,
      [vendorId, orderId]
    );

    if (existing.rows[0]) {
      return [];
    }

    const itemsResult = await client.query(
      `SELECT item.product_id,
              SUM(item.quantity)::numeric AS quantity
       FROM order_items item
       INNER JOIN orders orders ON orders.id = item.order_id
       WHERE orders.vendor_id = $1
         AND item.order_id = $2
         AND item.product_id IS NOT NULL
       GROUP BY item.product_id`,
      [vendorId, orderId]
    );

    const movements = [];

    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1,
             updated_at = NOW()
         WHERE vendor_id = $2
           AND id = $3`,
        [item.quantity, vendorId, item.product_id]
      );

      const movementResult = await client.query(
        `INSERT INTO stock_movements (
           vendor_id,
           product_id,
           type,
           quantity,
           reference_type,
           reference_id,
           notes,
           metadata,
           created_by
         )
         VALUES ($1, $2, 'outbound', $3, 'order', $4, $5, $6, $7)
         RETURNING id`,
        [
          vendorId,
          item.product_id,
          item.quantity,
          orderId,
          "Order stock allocation",
          { orderId },
          createdBy
        ]
      );

      movements.push(movementResult.rows[0]);
    }

    return movements;
  });
}

export {
  createOrderOutboundStockMovements,
  createStockMovementAndUpdateProduct,
  findInventoryProductForVendor,
  hasStockMovementForReference,
  listInventoryProductsForVendor,
  listStockMovementsForVendor
};
