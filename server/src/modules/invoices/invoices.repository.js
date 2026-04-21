import { query, withTransaction } from "../../config/db.js";

const INVOICE_SELECT = `invoice.id,
                        invoice.vendor_id,
                        invoice.customer_id,
                        invoice.vendor_customer_relationship_id,
                        invoice.order_id,
                        invoice.invoice_number,
                        invoice.status,
                        invoice.issue_date,
                        invoice.due_date,
                        invoice.subtotal,
                        invoice.discount_type,
                        invoice.discount_value,
                        invoice.discount_amount,
                        invoice.discount_total,
                        invoice.tax_enabled,
                        invoice.tax_rate,
                        invoice.tax_amount,
                        invoice.tax_total,
                        invoice.grand_total,
                        invoice.balance_due,
                        invoice.notes,
                        invoice.created_by,
                        invoice.created_at,
                        invoice.updated_at,
                        customer.full_name AS customer_full_name,
                        customer.company_name AS customer_company_name,
                        customer.email AS customer_email,
                        customer.phone AS customer_phone,
                        relationship.account_code AS customer_account_code,
                        relationship.status AS customer_relationship_status,
                        orders.order_number AS order_number,
                        orders.status AS order_status`;

const INVOICE_RETURNING = `id,
                           vendor_id,
                           customer_id,
                           vendor_customer_relationship_id,
                           order_id,
                           invoice_number,
                           status,
                           issue_date,
                           due_date,
                           subtotal,
                           discount_type,
                           discount_value,
                           discount_amount,
                           discount_total,
                           tax_enabled,
                           tax_rate,
                           tax_amount,
                           tax_total,
                           grand_total,
                           balance_due,
                           notes,
                           created_by,
                           created_at,
                           updated_at`;

const ITEM_SELECT = `item.id,
                     item.invoice_id,
                     item.vendor_id,
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

function invoiceJoinClause() {
  return `FROM invoices invoice
          INNER JOIN customers customer ON customer.id = invoice.customer_id
          LEFT JOIN vendor_customer_relationships relationship
            ON relationship.id = invoice.vendor_customer_relationship_id
           AND relationship.vendor_id = invoice.vendor_id
          LEFT JOIN orders
            ON orders.id = invoice.order_id
           AND orders.vendor_id = invoice.vendor_id`;
}

async function listInvoicesForVendor({
  vendorId,
  status = null,
  customerId = null,
  orderId = null,
  invoiceNumber = null,
  search = null,
  issueDateFrom = null,
  issueDateTo = null,
  dueDateFrom = null,
  dueDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["invoice.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`invoice.status = $${values.length}`);
  }

  if (customerId) {
    values.push(customerId);
    conditions.push(`invoice.customer_id = $${values.length}`);
  }

  if (orderId) {
    values.push(orderId);
    conditions.push(`invoice.order_id = $${values.length}`);
  }

  if (invoiceNumber) {
    values.push(invoiceNumber);
    conditions.push(`invoice.invoice_number = $${values.length}`);
  }

  if (issueDateFrom) {
    values.push(issueDateFrom);
    conditions.push(`invoice.issue_date >= $${values.length}`);
  }

  if (issueDateTo) {
    values.push(issueDateTo);
    conditions.push(`invoice.issue_date <= $${values.length}`);
  }

  if (dueDateFrom) {
    values.push(dueDateFrom);
    conditions.push(`invoice.due_date >= $${values.length}`);
  }

  if (dueDateTo) {
    values.push(dueDateTo);
    conditions.push(`invoice.due_date <= $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      invoice.invoice_number ILIKE $${values.length}
      OR COALESCE(invoice.notes, '') ILIKE $${values.length}
      OR customer.full_name ILIKE $${values.length}
      OR COALESCE(customer.company_name, '') ILIKE $${values.length}
      OR COALESCE(customer.email, '') ILIKE $${values.length}
      OR COALESCE(orders.order_number, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${invoiceJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${INVOICE_SELECT}
     ${invoiceJoinClause()}
     ${whereClause}
     ORDER BY invoice.created_at DESC, invoice.invoice_number DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findInvoiceForVendor(vendorId, invoiceId, client = { query }) {
  const result = await client.query(
    `SELECT ${INVOICE_SELECT}
     ${invoiceJoinClause()}
     WHERE invoice.vendor_id = $1
       AND invoice.id = $2
     LIMIT 1`,
    [vendorId, invoiceId]
  );

  return result.rows[0] || null;
}

async function listInvoiceItemsForVendor(vendorId, invoiceId, client = { query }) {
  const result = await client.query(
    `SELECT ${ITEM_SELECT}
     FROM invoice_items item
     LEFT JOIN products product
       ON product.id = item.product_id
      AND product.vendor_id = item.vendor_id
     WHERE item.vendor_id = $1
       AND item.invoice_id = $2
     ORDER BY item.sequence_number ASC`,
    [vendorId, invoiceId]
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

async function findOrderForVendor(vendorId, orderId, client = { query }) {
  const result = await client.query(
    `SELECT id,
            vendor_id,
            customer_id,
            vendor_customer_relationship_id,
            quotation_id,
            order_number,
            status,
            order_date,
            delivery_date,
            subtotal,
            discount_type,
            discount_value,
            discount_amount,
            discount_total,
            tax_enabled,
            tax_rate,
            tax_amount,
            tax_total,
            grand_total,
            notes
     FROM orders
     WHERE vendor_id = $1
       AND id = $2
     LIMIT 1`,
    [vendorId, orderId]
  );

  return result.rows[0] || null;
}

async function hasActiveInvoiceForOrder(vendorId, orderId, client = { query }) {
  const result = await client.query(
    `SELECT 1
     FROM invoices
     WHERE vendor_id = $1
       AND order_id = $2
       AND status <> 'void'
     LIMIT 1`,
    [vendorId, orderId]
  );

  return result.rowCount > 0;
}

async function listOrderItemsForInvoice(vendorId, orderId, client = { query }) {
  const result = await client.query(
    `SELECT item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount_total,
            item.tax_total,
            item.metadata
     FROM order_items item
     INNER JOIN orders ON orders.id = item.order_id
     WHERE orders.vendor_id = $1
       AND item.order_id = $2
     ORDER BY item.sequence_number ASC, item.created_at ASC`,
    [vendorId, orderId]
  );

  return result.rows;
}

async function createInvoiceWithItems({ invoice, items }) {
  return withTransaction(async (client) => {
    const invoiceResult = await client.query(
      `INSERT INTO invoices (
         vendor_id,
         customer_id,
         vendor_customer_relationship_id,
         order_id,
         invoice_number,
         status,
         issue_date,
         due_date,
         subtotal,
         discount_type,
         discount_value,
         discount_amount,
         discount_total,
         tax_enabled,
         tax_rate,
         tax_amount,
         tax_total,
         grand_total,
         balance_due,
         notes,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING ${INVOICE_RETURNING}`,
      [
        invoice.vendor_id,
        invoice.customer_id,
        invoice.vendor_customer_relationship_id,
        invoice.order_id,
        invoice.invoice_number,
        invoice.status,
        invoice.issue_date,
        invoice.due_date,
        invoice.subtotal,
        invoice.discount_type,
        invoice.discount_value,
        invoice.discount_amount,
        invoice.discount_total,
        invoice.tax_enabled,
        invoice.tax_rate,
        invoice.tax_amount,
        invoice.tax_total,
        invoice.grand_total,
        invoice.balance_due,
        invoice.notes,
        invoice.created_by
      ]
    );

    const createdInvoice = invoiceResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (
           invoice_id,
           vendor_id,
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          createdInvoice.id,
          invoice.vendor_id,
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

    return createdInvoice;
  });
}

async function updateInvoiceWithOptionalItems({ vendorId, invoiceId, invoiceUpdates, items = null }) {
  return withTransaction(async (client) => {
    const headerEntries = Object.entries(invoiceUpdates).filter(([, value]) => value !== undefined);

    if (headerEntries.length > 0) {
      const values = [];
      const setClauses = headerEntries.map(([column, value], index) => {
        values.push(value);
        return `${column} = $${index + 1}`;
      });

      values.push(vendorId);
      values.push(invoiceId);

      await client.query(
        `UPDATE invoices invoice
         SET ${setClauses.join(", ")},
             updated_at = NOW()
         WHERE invoice.vendor_id = $${values.length - 1}
           AND invoice.id = $${values.length}`,
        values
      );
    }

    if (items) {
      await client.query(
        `DELETE FROM invoice_items
         WHERE vendor_id = $1
           AND invoice_id = $2`,
        [vendorId, invoiceId]
      );

      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (
             invoice_id,
             vendor_id,
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
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            invoiceId,
            vendorId,
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

    return findInvoiceForVendor(vendorId, invoiceId, client);
  });
}

export {
  createInvoiceWithItems,
  findCustomerRelationshipForVendor,
  findInvoiceForVendor,
  findOrderForVendor,
  hasActiveInvoiceForOrder,
  listInvoiceItemsForVendor,
  listInvoicesForVendor,
  listOrderItemsForInvoice,
  listProductsByIdsForVendor,
  updateInvoiceWithOptionalItems
};
