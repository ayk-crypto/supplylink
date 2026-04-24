import { query } from "../../config/db.js";

function addFilter(conditions, values, value, clauseFactory) {
  if (value === null || value === undefined || value === "") {
    return;
  }

  values.push(value);
  conditions.push(clauseFactory(values.length));
}

function buildWhereClause(conditions) {
  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}

async function getVendorSummaryMetrics(vendorId, { dateFrom = null, dateTo = null } = {}) {
  const result = await query(
    `SELECT
       (
         SELECT COUNT(*)::int
         FROM vendor_customer_relationships relationship
         WHERE relationship.vendor_id = $1
           AND ($2::date IS NULL OR relationship.created_at::date >= $2::date)
           AND ($3::date IS NULL OR relationship.created_at::date <= $3::date)
       ) AS total_customers,
       (
         SELECT COUNT(*)::int
         FROM products product
         WHERE product.vendor_id = $1
           AND ($2::date IS NULL OR product.created_at::date >= $2::date)
           AND ($3::date IS NULL OR product.created_at::date <= $3::date)
       ) AS total_products,
       (
         SELECT COUNT(*)::int
         FROM quotations quotation
         WHERE quotation.vendor_id = $1
           AND ($2::date IS NULL OR quotation.issue_date >= $2::date)
           AND ($3::date IS NULL OR quotation.issue_date <= $3::date)
       ) AS total_quotations,
       (
         SELECT COUNT(*)::int
         FROM orders orders
         WHERE orders.vendor_id = $1
           AND ($2::date IS NULL OR orders.order_date >= $2::date)
           AND ($3::date IS NULL OR orders.order_date <= $3::date)
       ) AS total_orders,
       (
         SELECT COALESCE(SUM(orders.grand_total), 0)::numeric
         FROM orders orders
         WHERE orders.vendor_id = $1
           AND ($2::date IS NULL OR orders.order_date >= $2::date)
           AND ($3::date IS NULL OR orders.order_date <= $3::date)
       ) AS order_total,
       (
         SELECT COUNT(*)::int
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND ($2::date IS NULL OR invoice.issue_date >= $2::date)
           AND ($3::date IS NULL OR invoice.issue_date <= $3::date)
       ) AS total_invoices,
       (
         SELECT COALESCE(SUM(invoice.grand_total), 0)::numeric
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND ($2::date IS NULL OR invoice.issue_date >= $2::date)
           AND ($3::date IS NULL OR invoice.issue_date <= $3::date)
       ) AS invoice_total,
       (
         SELECT COALESCE(SUM(invoice.balance_due), 0)::numeric
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND invoice.status IN ('issued', 'partially_paid')
           AND ($2::date IS NULL OR invoice.issue_date >= $2::date)
           AND ($3::date IS NULL OR invoice.issue_date <= $3::date)
       ) AS outstanding_receivables,
       (
         SELECT COUNT(*)::int
         FROM payments payment
         WHERE payment.vendor_id = $1
           AND ($2::date IS NULL OR payment.payment_date >= $2::date)
           AND ($3::date IS NULL OR payment.payment_date <= $3::date)
       ) AS total_payments,
       (
         SELECT COALESCE(SUM(payment.amount), 0)::numeric
         FROM payments payment
         WHERE payment.vendor_id = $1
           AND ($2::date IS NULL OR payment.payment_date >= $2::date)
           AND ($3::date IS NULL OR payment.payment_date <= $3::date)
       ) AS payment_total,
       (
         SELECT COUNT(*)::int
         FROM routes route
         WHERE route.vendor_id = $1
           AND ($2::date IS NULL OR route.route_date >= $2::date)
           AND ($3::date IS NULL OR route.route_date <= $3::date)
       ) AS total_routes`,
    [vendorId, dateFrom, dateTo]
  );

  return result.rows[0] || null;
}

async function listOrderReportRows({
  vendorId,
  customerId = null,
  status = null,
  search = null,
  dateFrom = null,
  dateTo = null,
  deliveryDateFrom = null,
  deliveryDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["orders.vendor_id = $1"];
  const values = [vendorId];

  addFilter(conditions, values, customerId, (index) => `orders.customer_id = $${index}`);
  addFilter(conditions, values, status, (index) => `orders.status = $${index}`);
  addFilter(conditions, values, dateFrom, (index) => `orders.order_date >= $${index}`);
  addFilter(conditions, values, dateTo, (index) => `orders.order_date <= $${index}`);
  addFilter(conditions, values, deliveryDateFrom, (index) => `orders.delivery_date >= $${index}`);
  addFilter(conditions, values, deliveryDateTo, (index) => `orders.delivery_date <= $${index}`);

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

  const whereClause = buildWhereClause(conditions);
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM orders
     INNER JOIN customers customer ON customer.id = orders.customer_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT orders.id,
            orders.order_number,
            orders.status,
            orders.order_date,
            orders.delivery_date,
            orders.subtotal,
            orders.discount_total,
            orders.tax_total,
            orders.grand_total,
            orders.notes,
            orders.created_at,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email,
            quotation.id AS quotation_id,
            quotation.quote_number AS quotation_number
     FROM orders
     INNER JOIN customers customer ON customer.id = orders.customer_id
     LEFT JOIN quotations quotation
       ON quotation.id = orders.quotation_id
      AND quotation.vendor_id = orders.vendor_id
     ${whereClause}
     ORDER BY orders.order_date DESC NULLS LAST, orders.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function listInvoiceReportRows({
  vendorId,
  customerId = null,
  orderId = null,
  status = null,
  search = null,
  dateFrom = null,
  dateTo = null,
  dueDateFrom = null,
  dueDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["invoice.vendor_id = $1"];
  const values = [vendorId];

  addFilter(conditions, values, customerId, (index) => `invoice.customer_id = $${index}`);
  addFilter(conditions, values, orderId, (index) => `invoice.order_id = $${index}`);
  addFilter(conditions, values, status, (index) => `invoice.status = $${index}`);
  addFilter(conditions, values, dateFrom, (index) => `invoice.issue_date >= $${index}`);
  addFilter(conditions, values, dateTo, (index) => `invoice.issue_date <= $${index}`);
  addFilter(conditions, values, dueDateFrom, (index) => `invoice.due_date >= $${index}`);
  addFilter(conditions, values, dueDateTo, (index) => `invoice.due_date <= $${index}`);

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

  const whereClause = buildWhereClause(conditions);
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM invoices invoice
     INNER JOIN customers customer ON customer.id = invoice.customer_id
     LEFT JOIN orders
       ON orders.id = invoice.order_id
      AND orders.vendor_id = invoice.vendor_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT invoice.id,
            invoice.invoice_number,
            invoice.status,
            invoice.issue_date,
            invoice.due_date,
            invoice.subtotal,
            invoice.discount_total,
            invoice.tax_total,
            invoice.grand_total,
            invoice.balance_due,
            invoice.notes,
            invoice.created_at,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email,
            orders.id AS order_id,
            orders.order_number
     FROM invoices invoice
     INNER JOIN customers customer ON customer.id = invoice.customer_id
     LEFT JOIN orders
       ON orders.id = invoice.order_id
      AND orders.vendor_id = invoice.vendor_id
     ${whereClause}
     ORDER BY invoice.issue_date DESC NULLS LAST, invoice.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function listPaymentReportRows({
  vendorId,
  customerId = null,
  invoiceId = null,
  paymentMethod = null,
  search = null,
  dateFrom = null,
  dateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["payment.vendor_id = $1"];
  const values = [vendorId];

  addFilter(conditions, values, customerId, (index) => `payment.customer_id = $${index}`);
  addFilter(conditions, values, invoiceId, (index) => `payment.invoice_id = $${index}`);
  addFilter(conditions, values, paymentMethod, (index) => `payment.method = $${index}`);
  addFilter(conditions, values, dateFrom, (index) => `payment.payment_date >= $${index}`);
  addFilter(conditions, values, dateTo, (index) => `payment.payment_date <= $${index}`);

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      COALESCE(payment.payment_reference, '') ILIKE $${values.length}
      OR COALESCE(payment.notes, '') ILIKE $${values.length}
      OR COALESCE(payment.method, '') ILIKE $${values.length}
      OR customer.full_name ILIKE $${values.length}
      OR COALESCE(customer.company_name, '') ILIKE $${values.length}
      OR COALESCE(invoice.invoice_number, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = buildWhereClause(conditions);
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM payments payment
     INNER JOIN customers customer ON customer.id = payment.customer_id
     LEFT JOIN invoices invoice
       ON invoice.id = payment.invoice_id
      AND invoice.vendor_id = payment.vendor_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT payment.id,
            payment.amount,
            payment.method,
            payment.payment_reference,
            payment.payment_date,
            payment.notes,
            payment.created_at,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email,
            invoice.id AS invoice_id,
            invoice.invoice_number,
            invoice.status AS invoice_status
     FROM payments payment
     INNER JOIN customers customer ON customer.id = payment.customer_id
     LEFT JOIN invoices invoice
       ON invoice.id = payment.invoice_id
      AND invoice.vendor_id = payment.vendor_id
     ${whereClause}
     ORDER BY payment.payment_date DESC NULLS LAST, payment.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findCustomerRelationshipForVendor(vendorId, customerId) {
  const result = await query(
    `SELECT relationship.id,
            relationship.vendor_id,
            relationship.customer_id,
            relationship.account_code AS customer_account_code,
            relationship.status AS customer_relationship_status,
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

async function listStatementEntriesForVendor(vendorId, customerId, { dateFrom = null, dateTo = null } = {}) {
  const result = await query(
    `SELECT entry.id,
            entry.entry_type,
            entry.source_type,
            entry.amount,
            entry.entry_date,
            entry.notes,
            entry.invoice_id,
            entry.order_id,
            entry.payment_id,
            entry.created_at,
            invoice.invoice_number,
            payment.payment_reference,
            payment.method AS payment_method
     FROM ledger_entries entry
     LEFT JOIN invoices invoice
       ON invoice.id = entry.invoice_id
      AND invoice.vendor_id = entry.vendor_id
     LEFT JOIN payments payment
       ON payment.id = entry.payment_id
      AND payment.vendor_id = entry.vendor_id
     WHERE entry.vendor_id = $1
       AND entry.customer_id = $2
       AND ($3::date IS NULL OR entry.entry_date >= $3::date)
       AND ($4::date IS NULL OR entry.entry_date <= $4::date)
     ORDER BY entry.entry_date ASC, entry.created_at ASC, entry.id ASC`,
    [vendorId, customerId, dateFrom, dateTo]
  );

  return result.rows;
}

async function getStatementOpeningBalance(vendorId, customerId, dateFrom = null) {
  if (!dateFrom) {
    return 0;
  }

  const result = await query(
    `SELECT COALESCE(
       SUM(
         CASE
           WHEN entry.entry_type = 'debit' THEN entry.amount
           ELSE -entry.amount
         END
       ),
       0
     )::numeric AS opening_balance
     FROM ledger_entries entry
     WHERE entry.vendor_id = $1
       AND entry.customer_id = $2
       AND entry.entry_date < $3::date`,
    [vendorId, customerId, dateFrom]
  );

  return Number(result.rows[0]?.opening_balance || 0);
}

async function getAdminOverviewMetrics() {
  const result = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM vendors) AS total_vendors,
       (
         SELECT COUNT(*)::int
         FROM vendors
         WHERE status = 'active'
       ) AS active_vendors,
       (
         SELECT COUNT(*)::int
         FROM subscriptions
         WHERE status IN ('trial', 'active')
       ) AS live_subscriptions,
       (
         SELECT COUNT(*)::int
         FROM subscriptions
         WHERE status = 'active'
       ) AS active_subscriptions,
       (SELECT COUNT(*)::int FROM orders) AS total_orders,
       (SELECT COALESCE(SUM(grand_total), 0)::numeric FROM orders) AS order_total,
       (SELECT COUNT(*)::int FROM invoices) AS total_invoices,
       (SELECT COALESCE(SUM(grand_total), 0)::numeric FROM invoices) AS invoice_total,
       (SELECT COALESCE(SUM(balance_due), 0)::numeric FROM invoices) AS outstanding_receivables,
       (SELECT COUNT(*)::int FROM payments) AS total_payments,
       (SELECT COALESCE(SUM(amount), 0)::numeric FROM payments) AS payment_total`
  );

  return result.rows[0] || null;
}

export {
  findCustomerRelationshipForVendor,
  getAdminOverviewMetrics,
  getStatementOpeningBalance,
  getVendorSummaryMetrics,
  listInvoiceReportRows,
  listOrderReportRows,
  listPaymentReportRows,
  listStatementEntriesForVendor
};
