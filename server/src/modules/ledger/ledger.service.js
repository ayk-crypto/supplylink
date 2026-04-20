import AppError from "../../core/errors/AppError.js";
import {
  createPaymentAndLedger,
  findCustomerRelationshipForVendor,
  findInvoiceForVendor,
  findPaymentForVendor,
  listCustomerLedgerEntries,
  listLedgerEntriesForVendor,
  listPaymentsForVendor,
  updatePaymentSafeFields
} from "./ledger.repository.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";

const PAYMENT_UPDATE_FIELDS = {
  paymentMethod: "method",
  referenceNumber: "payment_reference",
  notes: "notes",
  metadata: "metadata"
};

function toColumnPayload(input = {}, fieldMap) {
  const payload = {};

  Object.entries(fieldMap).forEach(([inputKey, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      payload[column] = input[inputKey];
    }
  });

  return payload;
}

function toNumber(value) {
  return Number(value || 0);
}

function mapCustomer(row) {
  return {
    id: row.customer_id,
    relationshipId: row.vendor_customer_relationship_id,
    accountCode: row.customer_account_code,
    relationshipStatus: row.customer_relationship_status,
    fullName: row.customer_full_name,
    companyName: row.customer_company_name,
    email: row.customer_email,
    phone: row.customer_phone
  };
}

function mapInvoice(row) {
  return row.invoice_id
    ? {
        id: row.invoice_id,
        invoiceNumber: row.invoice_number,
        status: row.invoice_status,
        grandTotal: row.invoice_grand_total,
        balanceDue: row.invoice_balance_due
      }
    : null;
}

function mapPayment(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    vendorCustomerRelationshipId: row.vendor_customer_relationship_id,
    invoiceId: row.invoice_id,
    amount: row.amount,
    paymentMethod: row.method,
    referenceNumber: row.payment_reference,
    paymentDate: row.payment_date,
    notes: row.notes,
    metadata: row.metadata || {},
    createdBy: row.created_by,
    customer: mapCustomer(row),
    invoice: mapInvoice(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLedgerEntry(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    invoiceId: row.invoice_id,
    orderId: row.order_id,
    paymentId: row.payment_id,
    entryType: row.entry_type,
    sourceType: row.source_type,
    amount: row.amount,
    entryDate: row.entry_date,
    notes: row.notes,
    createdBy: row.created_by,
    customer: {
      id: row.customer_id,
      fullName: row.customer_full_name,
      companyName: row.customer_company_name,
      email: row.customer_email
    },
    invoice: row.invoice_id
      ? {
          id: row.invoice_id,
          invoiceNumber: row.invoice_number,
          status: row.invoice_status
        }
      : null,
    payment: row.payment_id
      ? {
          id: row.payment_id,
          referenceNumber: row.payment_reference,
          paymentMethod: row.payment_method
        }
      : null,
    createdAt: row.created_at
  };
}

function withRunningBalance(entries) {
  let runningBalance = 0;

  return entries.map((entry) => {
    const amount = toNumber(entry.amount);
    runningBalance += entry.entryType === "debit" ? amount : -amount;

    return {
      ...entry,
      runningBalance: Number(runningBalance.toFixed(2))
    };
  });
}

function assertPaymentFound(row, paymentId) {
  if (!row) {
    throw new AppError("Payment not found for this vendor", {
      statusCode: 404,
      code: "PAYMENT_NOT_FOUND",
      details: [
        {
          path: "paymentId",
          message: `No payment was found for ${paymentId}`
        }
      ]
    });
  }
}

async function assertCustomerLinkedToVendor(vendorId, customerId) {
  const relationship = await findCustomerRelationshipForVendor(vendorId, customerId);

  if (!relationship) {
    throw new AppError("Customer is not linked to this vendor", {
      statusCode: 422,
      code: "CUSTOMER_NOT_AVAILABLE",
      details: [
        {
          path: "customerId",
          message: "Payments and ledger entries can only use customers linked to the current vendor"
        }
      ]
    });
  }

  return relationship;
}

async function getPaymentDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listPaymentsForVendor({
    vendorId,
    customerId: query.customerId || null,
    invoiceId: query.invoiceId || null,
    paymentMethod: query.paymentMethod || null,
    search: query.search || null,
    paymentDateFrom: query.paymentDateFrom || null,
    paymentDateTo: query.paymentDateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapPayment),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      customerId: query.customerId || null,
      invoiceId: query.invoiceId || null,
      paymentMethod: query.paymentMethod || null,
      search: query.search || null,
      paymentDateFrom: query.paymentDateFrom || null,
      paymentDateTo: query.paymentDateTo || null
    }
  };
}

async function getPaymentDetail(vendorId, paymentId) {
  const payment = await findPaymentForVendor(vendorId, paymentId);

  assertPaymentFound(payment, paymentId);

  return mapPayment(payment);
}

async function createPayment(vendorId, payload, actor) {
  const relationship = await assertCustomerLinkedToVendor(vendorId, payload.customerId);
  let invoice = null;

  if (payload.invoiceId) {
    invoice = await findInvoiceForVendor(vendorId, payload.invoiceId);

    if (!invoice) {
      throw new AppError("Invoice not found for this vendor", {
        statusCode: 422,
        code: "INVOICE_NOT_AVAILABLE",
        details: [
          {
            path: "invoiceId",
            message: "Payments can only be linked to invoices in the current vendor"
          }
        ]
      });
    }

    if (invoice.customer_id !== payload.customerId) {
      throw new AppError("Invoice customer does not match payment customer", {
        statusCode: 422,
        code: "INVOICE_CUSTOMER_MISMATCH",
        details: [
          {
            path: "customerId",
            message: "When invoiceId is provided, customerId must match the invoice customer"
          }
        ]
      });
    }

    if (["draft", "void", "paid"].includes(invoice.status)) {
      throw new AppError("Invoice is not payable", {
        statusCode: 409,
        code: "INVOICE_NOT_PAYABLE",
        details: [
          {
            path: "invoiceId",
            message: "Payments can only be applied to issued or partially paid invoices"
          }
        ]
      });
    }

    if (toNumber(payload.amount) > toNumber(invoice.balance_due)) {
      throw new AppError("Payment exceeds invoice balance due", {
        statusCode: 422,
        code: "PAYMENT_EXCEEDS_BALANCE",
        details: [
          {
            path: "amount",
            message: "Create a separate on-account payment for amounts above the invoice balance"
          }
        ]
      });
    }
  }

  const payment = await createPaymentAndLedger({
    payment: {
      vendor_id: vendorId,
      customer_id: payload.customerId,
      vendor_customer_relationship_id: relationship.id,
      invoice_id: payload.invoiceId || null,
      amount: payload.amount,
      method: payload.paymentMethod || null,
      payment_reference: payload.referenceNumber || null,
      payment_date: payload.paymentDate || new Date().toISOString().slice(0, 10),
      notes: payload.notes || null,
      metadata: payload.metadata || {},
      created_by: actor.userId
    },
    invoice
  });

  const mappedPayment = mapPayment(payment);

  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: "payment.received",
      title: "Payment received",
      message: `Payment ${mappedPayment.referenceNumber || mappedPayment.id} for ${mappedPayment.customer.companyName || mappedPayment.customer.fullName} was recorded.`,
      relatedEntityType: "payment",
      relatedEntityId: mappedPayment.id,
      metadata: {
        paymentId: mappedPayment.id,
        customerId: mappedPayment.customerId,
        invoiceId: mappedPayment.invoiceId,
        amount: mappedPayment.amount,
        paymentMethod: mappedPayment.paymentMethod
      }
    })
  );

  return mappedPayment;
}

async function updatePayment(vendorId, paymentId, payload) {
  const existing = await findPaymentForVendor(vendorId, paymentId);

  assertPaymentFound(existing, paymentId);

  const payment = await updatePaymentSafeFields(
    vendorId,
    paymentId,
    toColumnPayload(payload, PAYMENT_UPDATE_FIELDS)
  );

  assertPaymentFound(payment, paymentId);

  return mapPayment(payment);
}

async function getLedgerDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listLedgerEntriesForVendor({
    vendorId,
    customerId: query.customerId || null,
    entryType: query.entryType || null,
    sourceType: query.sourceType || null,
    entryDateFrom: query.entryDateFrom || null,
    entryDateTo: query.entryDateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapLedgerEntry),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      customerId: query.customerId || null,
      entryType: query.entryType || null,
      sourceType: query.sourceType || null,
      entryDateFrom: query.entryDateFrom || null,
      entryDateTo: query.entryDateTo || null
    }
  };
}

async function getCustomerLedger(vendorId, customerId) {
  await assertCustomerLinkedToVendor(vendorId, customerId);

  const entries = (await listCustomerLedgerEntries(vendorId, customerId)).map(mapLedgerEntry);
  const items = withRunningBalance(entries);
  const endingBalance = items.length ? items[items.length - 1].runningBalance : 0;

  return {
    customerId,
    endingBalance,
    items
  };
}

export {
  createPayment,
  getCustomerLedger,
  getLedgerDirectory,
  getPaymentDetail,
  getPaymentDirectory,
  updatePayment
};
