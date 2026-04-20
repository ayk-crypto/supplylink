import { query, withTransaction } from "../../config/db.js";

const ORDER_SELECT = `orders.id,
                      orders.vendor_id,
                      orders.customer_id,
                      orders.vendor_customer_relationship_id,
                      orders.quotation_id,
                      orders.order_number,
                      orders.status,
                      orders.order_date,
                      orders.delivery_date,
                      orders.subtotal,
                      orders.discount_total,
                      orders.tax_total,
                      orders.grand_total,
                      orders.notes,
                      orders.created_by,
                      orders.created_at,
                      orders.updated_at,
                      customer.full_name AS customer_full_name,
                      customer.company_name AS customer_company_name,
                      customer.email AS customer_email,
                      customer.phone AS customer_phone,
                      relationship.account_code AS customer_account_code,
                      relationship.status AS customer_relationship_status,
                      quotation.quote_number AS quotation_quote_number,
                      quotation.status AS quotation_status`;

const ORDER_RETURNING = `id,
                         vendor_id,
                         customer_id,
                         vendor_customer_relationship_id,
                         quotation_id,
                         order_number,
                         status,
                         order_date,
                         delivery_date,
                         subtotal,
                         discount_total,
                         tax_total,
                         grand_total,
                         notes,
                         created_by,
                         created_at,
                         updated_at`;

const ITEM_SELECT = `item.id,
                     item.order_id,
                     item.product_id,
                     item.sequence_number,
                     item.description,
                     item.quantity,
                     item.unit_price,
                     item.discount_total,
                     item.tax_total,
                     item.line_total,
                     item.metadata,
                     item.created_at,
                     item.updated_at,
                     product.sku AS product_sku,
                     product.name AS product_name,
                     product.status AS product_status`;

function orderJoinClause() {
  return `FROM orders
          INNER JOIN customers customer ON customer.id = orders.customer_id
          LEFT JOIN vendor_customer_relationships relationship
            ON relationship.id = orders.vendor_customer_relationship_id
           AND relationship.vendor_id = orders.vendor_id
          LEFT JOIN quotations quotation
            ON quotation.id = orders.quotation_id
           AND quotation.vendor_id = orders.vendor_id`;
}

async function listOrdersForVendor({
  vendorId,
  status = null,
  customerId = null,
  quotationId = null,
  orderNumber = null,
  search = null,
  orderDateFrom = null,
  orderDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["orders.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`orders.status = $${values.length}`);
  }

  if (customerId) {
    values.push(customerId);
    conditions.push(`orders.customer_id = $${values.length}`);
  }

  if (quotationId) {
    values.push(quotationId);
    conditions.push(`orders.quotation_id = $${values.length}`);
  }

  if (orderNumber) {
    values.push(orderNumber);
    conditions.push(`orders.order_number = $${values.length}`);
  }

  if (orderDateFrom) {
    values.push(orderDateFrom);
    conditions.push(`orders.order_date >= $${values.length}`);
  }

  if (orderDateTo) {
    values.push(orderDateTo);
    conditions.push(`orders.order_date <= $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      orders.order_number ILIKE $${values.length}
      OR COALESCE(orders.notes, '') ILIKE $${values.length}
      OR customer.full_name ILIKE $${values.length}
      OR COALESCE(customer.company_name, '') ILIKE $${values.length}
      OR COALESCE(customer.email, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${orderJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${ORDER_SELECT}
     ${orderJoinClause()}
     ${whereClause}
     ORDER BY orders.created_at DESC, orders.order_number DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findOrderForVendor(vendorId, orderId, client = { query }) {
  const result = await client.query(
    `SELECT ${ORDER_SELECT}
     ${orderJoinClause()}
     WHERE orders.vendor_id = $1
       AND orders.id = $2
     LIMIT 1`,
    [vendorId, orderId]
  );

  return result.rows[0] || null;
}

async function listOrderItemsForVendor(vendorId, orderId, client = { query }) {
  const result = await client.query(
    `SELECT ${ITEM_SELECT}
     FROM order_items item
     INNER JOIN orders ON orders.id = item.order_id
     LEFT JOIN products product
       ON product.id = item.product_id
      AND product.vendor_id = orders.vendor_id
     WHERE orders.vendor_id = $1
       AND item.order_id = $2
     ORDER BY item.sequence_number ASC, item.created_at ASC`,
    [vendorId, orderId]
  );

  return result.rows;
}

async function findCustomerRelationshipForVendor(vendorId, customerId, client = { query }) {
  const result = await client.query(
    `SELECT relationship.id,
            relationship.vendor_id,
            relationship.customer_id,
            relationship.status,
            relationship.account_code,
            customer.full_name,
            customer.company_name,
            customer.email,
            customer.phone
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     WHERE relationship.vendor_id = $1
       AND relationship.customer_id = $2
     LIMIT 1`,
    [vendorId, customerId]
  );

  return result.rows[0] || null;
}

async function listProductsByIdsForVendor(vendorId, productIds, client = { query }) {
  if (productIds.length === 0) {
    return [];
  }

  const result = await client.query(
    `SELECT id,
            vendor_id,
            sku,
            name,
            description,
            unit_price,
            status
     FROM products
     WHERE vendor_id = $1
       AND id = ANY($2::uuid[])`,
    [vendorId, productIds]
  );

  return result.rows;
}

async function findQuotationForVendor(vendorId, quotationId, client = { query }) {
  const result = await client.query(
    `SELECT id,
            vendor_id,
            customer_id,
            vendor_customer_relationship_id,
            quote_number,
            status,
            issue_date,
            expiry_date,
            notes
     FROM quotations
     WHERE vendor_id = $1
       AND id = $2
     LIMIT 1`,
    [vendorId, quotationId]
  );

  return result.rows[0] || null;
}

async function listQuotationItemsForOrder(vendorId, quotationId, client = { query }) {
  const result = await client.query(
    `SELECT item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount_total,
            item.tax_total,
            item.metadata
     FROM quotation_items item
     WHERE item.vendor_id = $1
       AND item.quotation_id = $2
     ORDER BY item.sequence_number ASC`,
    [vendorId, quotationId]
  );

  return result.rows;
}

async function createOrderWithItems({ order, items }) {
  return withTransaction(async (client) => {
    const orderResult = await client.query(
      `INSERT INTO orders (
         vendor_id,
         customer_id,
         vendor_customer_relationship_id,
         quotation_id,
         order_number,
         status,
         order_date,
         delivery_date,
         subtotal,
         discount_total,
         tax_total,
         grand_total,
         notes,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING ${ORDER_RETURNING}`,
      [
        order.vendor_id,
        order.customer_id,
        order.vendor_customer_relationship_id,
        order.quotation_id,
        order.order_number,
        order.status,
        order.order_date,
        order.delivery_date,
        order.subtotal,
        order.discount_total,
        order.tax_total,
        order.grand_total,
        order.notes,
        order.created_by
      ]
    );

    const createdOrder = orderResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (
           order_id,
           product_id,
           sequence_number,
           description,
           quantity,
           unit_price,
           discount_total,
           tax_total,
           line_total,
           metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          createdOrder.id,
          item.product_id,
          item.sequence_number,
          item.description,
          item.quantity,
          item.unit_price,
          item.discount_total,
          item.tax_total,
          item.line_total,
          item.metadata
        ]
      );
    }

    return createdOrder;
  });
}

async function updateOrderWithOptionalItems({ vendorId, orderId, orderUpdates, items = null }) {
  return withTransaction(async (client) => {
    const headerEntries = Object.entries(orderUpdates).filter(([, value]) => value !== undefined);

    if (headerEntries.length > 0) {
      const values = [];
      const setClauses = headerEntries.map(([column, value], index) => {
        values.push(value);
        return `${column} = $${index + 1}`;
      });

      values.push(vendorId);
      values.push(orderId);

      await client.query(
        `UPDATE orders
         SET ${setClauses.join(", ")},
             updated_at = NOW()
         WHERE vendor_id = $${values.length - 1}
           AND id = $${values.length}`,
        values
      );
    }

    if (items) {
      await client.query(
        `DELETE FROM order_items
         USING orders
         WHERE orders.id = order_items.order_id
           AND orders.vendor_id = $1
           AND order_items.order_id = $2`,
        [vendorId, orderId]
      );

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (
             order_id,
             product_id,
             sequence_number,
             description,
             quantity,
             unit_price,
             discount_total,
             tax_total,
             line_total,
             metadata
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            orderId,
            item.product_id,
            item.sequence_number,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount_total,
            item.tax_total,
            item.line_total,
            item.metadata
          ]
        );
      }
    }

    return findOrderForVendor(vendorId, orderId, client);
  });
}

export {
  createOrderWithItems,
  findCustomerRelationshipForVendor,
  findOrderForVendor,
  findQuotationForVendor,
  listOrderItemsForVendor,
  listOrdersForVendor,
  listProductsByIdsForVendor,
  listQuotationItemsForOrder,
  updateOrderWithOptionalItems
};
