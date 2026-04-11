import { query, withTransaction } from "../../config/db.js";

const PAYMENT_SELECT = `payment.id,
                        payment.vendor_id,
                        payment.customer_id,
                        payment.vendor_customer_relationship_id,
                        payment.invoice_id,
                        payment.amount,
                        payment.method,
                        payment.payment_reference,
                        payment.payment_date,
                        payment.notes,
                        payment.metadata,
                        payment.created_by,
                        payment.created_at,
                        payment.updated_at,
                        customer.full_name AS customer_full_name,
                        customer.company_name AS customer_company_name,
                        customer.email AS customer_email,
                        customer.phone AS customer_phone,
                        relationship.account_code AS customer_account_code,
                        relationship.status AS customer_relationship_status,
                        invoice.invoice_number,
                        invoice.status AS invoice_status,
                        invoice.grand_total AS invoice_grand_total,
                        invoice.balance_due AS invoice_balance_due`;

const LEDGER_SELECT = `entry.id,
                       entry.vendor_id,
                       entry.customer_id,
                       entry.invoice_id,
                       entry.order_id,
                       entry.payment_id,
                       entry.entry_type,
                       entry.source_type,
                       entry.amount,
                       entry.entry_date,
                       entry.notes,
                       entry.created_by,
                       entry.created_at,
                       customer.full_name AS customer_full_name,
                       customer.company_name AS customer_company_name,
                       customer.email AS customer_email,
                       invoice.invoice_number,
                       invoice.status AS invoice_status,
                       payment.payment_reference,
                       payment.method AS payment_method`;

function paymentJoinClause() {
  return `FROM payments payment
          INNER JOIN customers customer ON customer.id = payment.customer_id
          INNER JOIN vendor_customer_relationships relationship
            ON relationship.id = payment.vendor_customer_relationship_id
           AND relationship.vendor_id = payment.vendor_id
          LEFT JOIN invoices invoice
            ON invoice.id = payment.invoice_id
           AND invoice.vendor_id = payment.vendor_id`;
}

function ledgerJoinClause() {
  return `FROM ledger_entries entry
          INNER JOIN customers customer ON customer.id = entry.customer_id
          LEFT JOIN invoices invoice
            ON invoice.id = entry.invoice_id
           AND invoice.vendor_id = entry.vendor_id
          LEFT JOIN payments payment
            ON payment.id = entry.payment_id
           AND payment.vendor_id = entry.vendor_id`;
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

async function findInvoiceForVendor(vendorId, invoiceId, client = { query }) {
  const result = await client.query(
    `SELECT id,
            vendor_id,
            customer_id,
            vendor_customer_relationship_id,
            order_id,
            invoice_number,
            status,
            issue_date,
            due_date,
            grand_total,
            balance_due,
            notes
     FROM invoices
     WHERE vendor_id = $1
       AND id = $2
     LIMIT 1`,
    [vendorId, invoiceId]
  );

  return result.rows[0] || null;
}

async function getInvoicePaymentTotal(vendorId, invoiceId, client = { query }) {
  const result = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid
     FROM payments
     WHERE vendor_id = $1
       AND invoice_id = $2`,
    [vendorId, invoiceId]
  );

  return Number(result.rows[0]?.total_paid || 0);
}

async function ensureInvoiceLedgerEntry(vendorId, invoiceId, actorUserId = null, client = { query }) {
  const invoice = await findInvoiceForVendor(vendorId, invoiceId, client);

  if (!invoice || invoice.status === "draft" || invoice.status === "void") {
    return null;
  }

  const entryDate = invoice.issue_date || new Date().toISOString().slice(0, 10);
  const result = await client.query(
    `INSERT INTO ledger_entries (
       vendor_id,
       customer_id,
       invoice_id,
       order_id,
       entry_type,
       source_type,
       amount,
       entry_date,
       notes,
       created_by
     )
     VALUES ($1, $2, $3, $4, 'debit', 'invoice', $5, $6, $7, $8)
     ON CONFLICT (vendor_id, invoice_id)
     WHERE source_type = 'invoice' AND invoice_id IS NOT NULL
     DO UPDATE
     SET customer_id = EXCLUDED.customer_id,
         order_id = EXCLUDED.order_id,
         amount = EXCLUDED.amount,
         entry_date = EXCLUDED.entry_date,
         notes = EXCLUDED.notes
     RETURNING id`,
    [
      invoice.vendor_id,
      invoice.customer_id,
      invoice.id,
      invoice.order_id,
      invoice.grand_total,
      entryDate,
      `Invoice ${invoice.invoice_number}`,
      actorUserId
    ]
  );

  return result.rows[0] || null;
}

async function listPaymentsForVendor({
  vendorId,
  customerId = null,
  invoiceId = null,
  paymentMethod = null,
  search = null,
  paymentDateFrom = null,
  paymentDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["payment.vendor_id = $1"];
  const values = [vendorId];

  if (customerId) {
    values.push(customerId);
    conditions.push(`payment.customer_id = $${values.length}`);
  }

  if (invoiceId) {
    values.push(invoiceId);
    conditions.push(`payment.invoice_id = $${values.length}`);
  }

  if (paymentMethod) {
    values.push(paymentMethod);
    conditions.push(`payment.method = $${values.length}`);
  }

  if (paymentDateFrom) {
    values.push(paymentDateFrom);
    conditions.push(`payment.payment_date >= $${values.length}`);
  }

  if (paymentDateTo) {
    values.push(paymentDateTo);
    conditions.push(`payment.payment_date <= $${values.length}`);
  }

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

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${paymentJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${PAYMENT_SELECT}
     ${paymentJoinClause()}
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

async function findPaymentForVendor(vendorId, paymentId, client = { query }) {
  const result = await client.query(
    `SELECT ${PAYMENT_SELECT}
     ${paymentJoinClause()}
     WHERE payment.vendor_id = $1
       AND payment.id = $2
     LIMIT 1`,
    [vendorId, paymentId]
  );

  return result.rows[0] || null;
}

async function createPaymentAndLedger({ payment, invoice = null }) {
  return withTransaction(async (client) => {
    if (invoice) {
      await ensureInvoiceLedgerEntry(payment.vendor_id, invoice.id, payment.created_by, client);
    }

    const paymentResult = await client.query(
      `INSERT INTO payments (
         vendor_id,
         customer_id,
         vendor_customer_relationship_id,
         invoice_id,
         amount,
         method,
         payment_reference,
         payment_date,
         notes,
         metadata,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        payment.vendor_id,
        payment.customer_id,
        payment.vendor_customer_relationship_id,
        payment.invoice_id,
        payment.amount,
        payment.method,
        payment.payment_reference,
        payment.payment_date,
        payment.notes,
        payment.metadata,
        payment.created_by
      ]
    );

    const createdPayment = paymentResult.rows[0];
    const entryDate = payment.payment_date || new Date().toISOString().slice(0, 10);

    await client.query(
      `INSERT INTO ledger_entries (
         vendor_id,
         customer_id,
         invoice_id,
         payment_id,
         entry_type,
         source_type,
         amount,
         entry_date,
         notes,
         created_by
       )
       VALUES ($1, $2, $3, $4, 'credit', 'payment', $5, $6, $7, $8)
       ON CONFLICT (vendor_id, payment_id)
       WHERE source_type = 'payment' AND payment_id IS NOT NULL
       DO UPDATE
       SET amount = EXCLUDED.amount,
           entry_date = EXCLUDED.entry_date,
           notes = EXCLUDED.notes`,
      [
        payment.vendor_id,
        payment.customer_id,
        payment.invoice_id,
        createdPayment.id,
        payment.amount,
        entryDate,
        payment.invoice_id ? "Payment received for invoice" : "Advance payment received",
        payment.created_by
      ]
    );

    if (invoice) {
      const totalPaid = await getInvoicePaymentTotal(payment.vendor_id, invoice.id, client);
      const grandTotal = Number(invoice.grand_total || 0);
      const balanceDue = Number(Math.max(grandTotal - totalPaid, 0).toFixed(2));
      const nextStatus = balanceDue === 0 ? "paid" : "partially_paid";

      await client.query(
        `UPDATE invoices
         SET balance_due = $1,
             status = $2,
             updated_at = NOW()
         WHERE vendor_id = $3
           AND id = $4`,
        [balanceDue, nextStatus, payment.vendor_id, invoice.id]
      );
    }

    return findPaymentForVendor(payment.vendor_id, createdPayment.id, client);
  });
}

async function updatePaymentSafeFields(vendorId, paymentId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findPaymentForVendor(vendorId, paymentId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);
  values.push(paymentId);

  const result = await query(
    `UPDATE payments payment
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE payment.vendor_id = $${values.length - 1}
       AND payment.id = $${values.length}
     RETURNING id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return findPaymentForVendor(vendorId, paymentId);
}

async function listLedgerEntriesForVendor({
  vendorId,
  customerId = null,
  entryType = null,
  sourceType = null,
  entryDateFrom = null,
  entryDateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["entry.vendor_id = $1"];
  const values = [vendorId];

  if (customerId) {
    values.push(customerId);
    conditions.push(`entry.customer_id = $${values.length}`);
  }

  if (entryType) {
    values.push(entryType);
    conditions.push(`entry.entry_type = $${values.length}`);
  }

  if (sourceType) {
    values.push(sourceType);
    conditions.push(`entry.source_type = $${values.length}`);
  }

  if (entryDateFrom) {
    values.push(entryDateFrom);
    conditions.push(`entry.entry_date >= $${values.length}`);
  }

  if (entryDateTo) {
    values.push(entryDateTo);
    conditions.push(`entry.entry_date <= $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${ledgerJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${LEDGER_SELECT}
     ${ledgerJoinClause()}
     ${whereClause}
     ORDER BY entry.entry_date ASC, entry.created_at ASC, entry.id ASC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function listCustomerLedgerEntries(vendorId, customerId) {
  const result = await query(
    `SELECT ${LEDGER_SELECT}
     ${ledgerJoinClause()}
     WHERE entry.vendor_id = $1
       AND entry.customer_id = $2
     ORDER BY entry.entry_date ASC, entry.created_at ASC, entry.id ASC`,
    [vendorId, customerId]
  );

  return result.rows;
}

export {
  createPaymentAndLedger,
  ensureInvoiceLedgerEntry,
  findCustomerRelationshipForVendor,
  findInvoiceForVendor,
  findPaymentForVendor,
  listCustomerLedgerEntries,
  listLedgerEntriesForVendor,
  listPaymentsForVendor,
  updatePaymentSafeFields
};
