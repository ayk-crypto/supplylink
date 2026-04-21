import { query } from "../../config/db.js";

async function listRecentDashboardQuotations(vendorId, limit = 5) {
  const result = await query(
    `SELECT quotation.id,
            quotation.quote_number,
            quotation.status,
            quotation.issue_date,
            quotation.expiry_date,
            quotation.grand_total,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email
     FROM quotations quotation
     INNER JOIN customers customer ON customer.id = quotation.customer_id
     WHERE quotation.vendor_id = $1
     ORDER BY quotation.issue_date DESC NULLS LAST, quotation.created_at DESC
     LIMIT $2`,
    [vendorId, limit]
  );

  return result.rows;
}

async function listRecentDashboardOrders(vendorId, limit = 5) {
  const result = await query(
    `SELECT orders.id,
            orders.order_number,
            orders.status,
            orders.order_date,
            orders.delivery_date,
            orders.grand_total,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email
     FROM orders
     INNER JOIN customers customer ON customer.id = orders.customer_id
     WHERE orders.vendor_id = $1
     ORDER BY orders.order_date DESC NULLS LAST, orders.created_at DESC
     LIMIT $2`,
    [vendorId, limit]
  );

  return result.rows;
}

async function listRecentDashboardInvoices(vendorId, limit = 5) {
  const result = await query(
    `SELECT invoice.id,
            invoice.invoice_number,
            invoice.status,
            invoice.issue_date,
            invoice.due_date,
            invoice.grand_total,
            invoice.balance_due,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email
     FROM invoices invoice
     INNER JOIN customers customer ON customer.id = invoice.customer_id
     WHERE invoice.vendor_id = $1
     ORDER BY invoice.issue_date DESC NULLS LAST, invoice.created_at DESC
     LIMIT $2`,
    [vendorId, limit]
  );

  return result.rows;
}

async function listRecentDashboardPayments(vendorId, limit = 5) {
  const result = await query(
    `SELECT payment.id,
            payment.amount,
            payment.method,
            payment.payment_reference,
            payment.payment_date,
            payment.created_at,
            invoice.id AS invoice_id,
            invoice.invoice_number,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email
     FROM payments payment
     INNER JOIN customers customer ON customer.id = payment.customer_id
     LEFT JOIN invoices invoice ON invoice.id = payment.invoice_id
     WHERE payment.vendor_id = $1
     ORDER BY payment.payment_date DESC NULLS LAST, payment.created_at DESC
     LIMIT $2`,
    [vendorId, limit]
  );

  return result.rows;
}

async function listDashboardOverdueInvoices(vendorId, limit = 5) {
  const result = await query(
    `SELECT invoice.id,
            invoice.invoice_number,
            invoice.status,
            invoice.issue_date,
            invoice.due_date,
            invoice.grand_total,
            invoice.balance_due,
            customer.id AS customer_id,
            customer.full_name AS customer_full_name,
            customer.company_name AS customer_company_name,
            customer.email AS customer_email
     FROM invoices invoice
     INNER JOIN customers customer ON customer.id = invoice.customer_id
     WHERE invoice.vendor_id = $1
       AND invoice.status IN ('issued', 'partially_paid')
       AND invoice.due_date IS NOT NULL
       AND invoice.due_date < CURRENT_DATE
       AND invoice.balance_due > 0
     ORDER BY invoice.due_date ASC, invoice.created_at DESC
     LIMIT $2`,
    [vendorId, limit]
  );

  return result.rows;
}

async function listDashboardTopCustomers(vendorId, limit = 5) {
  const result = await query(
    `WITH billed AS (
       SELECT invoice.customer_id,
              COUNT(*)::int AS invoice_count,
              COALESCE(SUM(invoice.grand_total), 0)::numeric AS billed_total,
              COALESCE(SUM(invoice.balance_due), 0)::numeric AS outstanding_total
       FROM invoices invoice
       WHERE invoice.vendor_id = $1
         AND invoice.status <> 'void'
       GROUP BY invoice.customer_id
     ),
     collected AS (
       SELECT payment.customer_id,
              COUNT(*)::int AS payment_count,
              COALESCE(SUM(payment.amount), 0)::numeric AS collected_total,
              MAX(payment.payment_date) AS last_payment_date
       FROM payments payment
       WHERE payment.vendor_id = $1
       GROUP BY payment.customer_id
     )
     SELECT customer.id,
            customer.full_name,
            customer.company_name,
            customer.email,
            COALESCE(billed.invoice_count, 0) AS invoice_count,
            COALESCE(collected.payment_count, 0) AS payment_count,
            COALESCE(billed.billed_total, 0)::numeric AS billed_total,
            COALESCE(collected.collected_total, 0)::numeric AS collected_total,
            COALESCE(billed.outstanding_total, 0)::numeric AS outstanding_total,
            collected.last_payment_date
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     LEFT JOIN billed ON billed.customer_id = customer.id
     LEFT JOIN collected ON collected.customer_id = customer.id
     WHERE relationship.vendor_id = $1
     ORDER BY GREATEST(
       COALESCE(billed.billed_total, 0),
       COALESCE(collected.collected_total, 0)
     ) DESC,
     COALESCE(billed.billed_total, 0) DESC,
     customer.company_name ASC NULLS LAST,
     customer.full_name ASC
     LIMIT $2`,
    [vendorId, limit]
  );

  return result.rows;
}

async function getDashboardAggregates(vendorId) {
  const result = await query(
    `SELECT
       (
         SELECT COUNT(*)::int
         FROM products product
         WHERE product.vendor_id = $1
       ) AS inventory_product_count,
       (
         SELECT COALESCE(SUM(product.stock_quantity), 0)::numeric
         FROM products product
         WHERE product.vendor_id = $1
       ) AS inventory_total_stock_quantity,
       (
         SELECT COUNT(*)::int
         FROM products product
         WHERE product.vendor_id = $1
           AND product.stock_quantity <= product.low_stock_threshold
       ) AS inventory_low_stock_count,
       (
         SELECT COUNT(*)::int
         FROM products product
         WHERE product.vendor_id = $1
           AND product.stock_quantity < 0
       ) AS inventory_negative_stock_count,
       (
         SELECT COALESCE(jsonb_object_agg(status_counts.status, status_counts.total), '{}'::jsonb)
         FROM (
           SELECT orders.status,
                  COUNT(*)::int AS total
           FROM orders
           WHERE orders.vendor_id = $1
           GROUP BY orders.status
         ) status_counts
       ) AS orders_by_status,
       (
         SELECT COUNT(*)::int
         FROM orders
         WHERE orders.vendor_id = $1
       ) AS orders_total_count,
       (
         SELECT COALESCE(jsonb_object_agg(status_counts.status, status_counts.total), '{}'::jsonb)
         FROM (
           SELECT invoice.status,
                  COUNT(*)::int AS total
           FROM invoices invoice
           WHERE invoice.vendor_id = $1
           GROUP BY invoice.status
         ) status_counts
       ) AS invoices_by_status,
       (
         SELECT COUNT(*)::int
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
       ) AS invoices_total_count,
       (
         SELECT COUNT(*)::int
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND invoice.status IN ('issued', 'partially_paid')
       ) AS receivables_open_invoice_count,
       (
         SELECT COALESCE(SUM(invoice.balance_due), 0)::numeric
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND invoice.status IN ('issued', 'partially_paid')
       ) AS receivables_outstanding_total,
       (
         SELECT COUNT(*)::int
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND invoice.status IN ('issued', 'partially_paid')
           AND invoice.due_date IS NOT NULL
           AND invoice.due_date < CURRENT_DATE
       ) AS receivables_overdue_invoice_count,
       (
         SELECT COALESCE(SUM(invoice.balance_due), 0)::numeric
         FROM invoices invoice
         WHERE invoice.vendor_id = $1
           AND invoice.status IN ('issued', 'partially_paid')
           AND invoice.due_date IS NOT NULL
           AND invoice.due_date < CURRENT_DATE
       ) AS receivables_overdue_total`,
    [vendorId]
  );

  return result.rows[0] || null;
}

export {
  getDashboardAggregates,
  listDashboardOverdueInvoices,
  listDashboardTopCustomers,
  listRecentDashboardInvoices,
  listRecentDashboardOrders,
  listRecentDashboardPayments,
  listRecentDashboardQuotations
};
