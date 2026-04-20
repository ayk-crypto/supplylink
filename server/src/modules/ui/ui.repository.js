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

export { listRecentDashboardInvoices, listRecentDashboardOrders };
