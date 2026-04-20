import { query } from "../../config/db.js";

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

export { getDashboardAggregates, listRecentDashboardInvoices, listRecentDashboardOrders };
