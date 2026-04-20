import { query, withTransaction } from "../../config/db.js";

const QUOTATION_SELECT = `quotation.id,
                          quotation.vendor_id,
                          quotation.customer_id,
                          quotation.vendor_customer_relationship_id,
                          quotation.quote_number,
                          quotation.status,
                          quotation.issue_date,
                          quotation.expiry_date,
                          quotation.subtotal,
                          quotation.discount_total,
                          quotation.tax_total,
                          quotation.grand_total,
                          quotation.notes,
                          quotation.created_by,
                          quotation.created_at,
                          quotation.updated_at,
                          customer.full_name AS customer_full_name,
                          customer.company_name AS customer_company_name,
                          customer.email AS customer_email,
                          customer.phone AS customer_phone,
                          relationship.account_code AS customer_account_code,
                          relationship.status AS customer_relationship_status`;

const QUOTATION_RETURNING = `id,
                             vendor_id,
                             customer_id,
                             vendor_customer_relationship_id,
                             quote_number,
                             status,
                             issue_date,
                             expiry_date,
                             subtotal,
                             discount_total,
                             tax_total,
                             grand_total,
                             notes,
                             created_by,
                             created_at,
                             updated_at`;

const ITEM_SELECT = `item.id,
                     item.quotation_id,
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

function quotationJoinClause() {
  return `FROM quotations quotation
          INNER JOIN customers customer ON customer.id = quotation.customer_id
          LEFT JOIN vendor_customer_relationships relationship
            ON relationship.id = quotation.vendor_customer_relationship_id
           AND relationship.vendor_id = quotation.vendor_id`;
}

async function listQuotationsForVendor({
  vendorId,
  status = null,
  customerId = null,
  quoteNumber = null,
  search = null,
  issueDateFrom = null,
  issueDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["quotation.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`quotation.status = $${values.length}`);
  }

  if (customerId) {
    values.push(customerId);
    conditions.push(`quotation.customer_id = $${values.length}`);
  }

  if (quoteNumber) {
    values.push(quoteNumber);
    conditions.push(`quotation.quote_number = $${values.length}`);
  }

  if (issueDateFrom) {
    values.push(issueDateFrom);
    conditions.push(`quotation.issue_date >= $${values.length}`);
  }

  if (issueDateTo) {
    values.push(issueDateTo);
    conditions.push(`quotation.issue_date <= $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      quotation.quote_number ILIKE $${values.length}
      OR COALESCE(quotation.notes, '') ILIKE $${values.length}
      OR customer.full_name ILIKE $${values.length}
      OR COALESCE(customer.company_name, '') ILIKE $${values.length}
      OR COALESCE(customer.email, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${quotationJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${QUOTATION_SELECT}
     ${quotationJoinClause()}
     ${whereClause}
     ORDER BY quotation.created_at DESC, quotation.quote_number DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findQuotationForVendor(vendorId, quotationId, client = { query }) {
  const result = await client.query(
    `SELECT ${QUOTATION_SELECT}
     ${quotationJoinClause()}
     WHERE quotation.vendor_id = $1
       AND quotation.id = $2
     LIMIT 1`,
    [vendorId, quotationId]
  );

  return result.rows[0] || null;
}

async function listQuotationItemsForVendor(vendorId, quotationId, client = { query }) {
  const result = await client.query(
    `SELECT ${ITEM_SELECT}
     FROM quotation_items item
     LEFT JOIN products product
       ON product.id = item.product_id
      AND product.vendor_id = item.vendor_id
     WHERE item.vendor_id = $1
       AND item.quotation_id = $2
     ORDER BY item.sequence_number ASC`,
    [vendorId, quotationId]
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

async function createQuotationWithItems({ quotation, items }) {
  return withTransaction(async (client) => {
    const quotationResult = await client.query(
      `INSERT INTO quotations (
         vendor_id,
         customer_id,
         vendor_customer_relationship_id,
         quote_number,
         status,
         issue_date,
         expiry_date,
         subtotal,
         discount_total,
         tax_total,
         grand_total,
         notes,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${QUOTATION_RETURNING}`,
      [
        quotation.vendor_id,
        quotation.customer_id,
        quotation.vendor_customer_relationship_id,
        quotation.quote_number,
        quotation.status,
        quotation.issue_date,
        quotation.expiry_date,
        quotation.subtotal,
        quotation.discount_total,
        quotation.tax_total,
        quotation.grand_total,
        quotation.notes,
        quotation.created_by
      ]
    );

    const createdQuotation = quotationResult.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO quotation_items (
           quotation_id,
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
          createdQuotation.id,
          quotation.vendor_id,
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

    return createdQuotation;
  });
}

async function updateQuotationWithOptionalItems({
  vendorId,
  quotationId,
  quotationUpdates,
  items = null
}) {
  return withTransaction(async (client) => {
    const headerEntries = Object.entries(quotationUpdates).filter(([, value]) => value !== undefined);

    if (headerEntries.length > 0) {
      const values = [];
      const setClauses = headerEntries.map(([column, value], index) => {
        values.push(value);
        return `${column} = $${index + 1}`;
      });

      values.push(vendorId);
      values.push(quotationId);

      await client.query(
        `UPDATE quotations quotation
         SET ${setClauses.join(", ")},
             updated_at = NOW()
         WHERE quotation.vendor_id = $${values.length - 1}
           AND quotation.id = $${values.length}`,
        values
      );
    }

    if (items) {
      await client.query(
        `DELETE FROM quotation_items
         WHERE vendor_id = $1
           AND quotation_id = $2`,
        [vendorId, quotationId]
      );

      for (const item of items) {
        await client.query(
          `INSERT INTO quotation_items (
             quotation_id,
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
            quotationId,
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

    return findQuotationForVendor(vendorId, quotationId, client);
  });
}

export {
  createQuotationWithItems,
  findCustomerRelationshipForVendor,
  findQuotationForVendor,
  listProductsByIdsForVendor,
  listQuotationItemsForVendor,
  listQuotationsForVendor,
  updateQuotationWithOptionalItems
};
