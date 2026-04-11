import AppError from "../../core/errors/AppError.js";
import {
  findCustomerRelationshipForVendor,
  getAdminOverviewMetrics,
  getStatementOpeningBalance,
  getVendorSummaryMetrics,
  listInvoiceReportRows,
  listOrderReportRows,
  listPaymentReportRows,
  listStatementEntriesForVendor
} from "./reports.repository.js";

const EXPORT_LIMIT = 5000;

function toNumber(value) {
  return Number(value || 0);
}

function getPagination(query, defaultPageSize = 20) {
  const page = query.page || 1;
  const pageSize = query.pageSize || defaultPageSize;

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize
  };
}

function buildPagination(page, pageSize, total) {
  return {
    page,
    pageSize,
    totalItems: total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
  };
}

function mapCustomer(row) {
  return {
    id: row.customer_id,
    fullName: row.customer_full_name || row.full_name,
    companyName: row.customer_company_name || row.company_name,
    email: row.customer_email || row.email,
    phone: row.customer_phone || row.phone,
    accountCode: row.customer_account_code || null,
    relationshipStatus: row.customer_relationship_status || null
  };
}

function mapOrderReportRow(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    orderDate: row.order_date,
    deliveryDate: row.delivery_date,
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    taxTotal: row.tax_total,
    grandTotal: row.grand_total,
    notes: row.notes,
    customer: mapCustomer(row),
    quotation: row.quotation_id
      ? {
          id: row.quotation_id,
          quoteNumber: row.quotation_number
        }
      : null,
    createdAt: row.created_at
  };
}

function mapInvoiceReportRow(row) {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    subtotal: row.subtotal,
    discountTotal: row.discount_total,
    taxTotal: row.tax_total,
    grandTotal: row.grand_total,
    balanceDue: row.balance_due,
    notes: row.notes,
    customer: mapCustomer(row),
    order: row.order_id
      ? {
          id: row.order_id,
          orderNumber: row.order_number
        }
      : null,
    createdAt: row.created_at
  };
}

function mapPaymentReportRow(row) {
  return {
    id: row.id,
    amount: row.amount,
    paymentMethod: row.method,
    referenceNumber: row.payment_reference,
    paymentDate: row.payment_date,
    notes: row.notes,
    customer: mapCustomer(row),
    invoice: row.invoice_id
      ? {
          id: row.invoice_id,
          invoiceNumber: row.invoice_number,
          status: row.invoice_status
        }
      : null,
    createdAt: row.created_at
  };
}

function mapStatementEntry(row, runningBalance) {
  return {
    id: row.id,
    entryType: row.entry_type,
    sourceType: row.source_type,
    amount: row.amount,
    entryDate: row.entry_date,
    notes: row.notes,
    runningBalance,
    invoice: row.invoice_id
      ? {
          id: row.invoice_id,
          invoiceNumber: row.invoice_number
        }
      : null,
    orderId: row.order_id,
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

function buildReportResponse(rows, total, pagination, filters, mapRow) {
  return {
    items: rows.map(mapRow),
    pagination: buildPagination(pagination.page, pagination.pageSize, total),
    filters
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function toCsv(headers, rows) {
  const headerLine = headers.map((header) => csvEscape(header.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((header) => csvEscape(header.value(row))).join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

function getOrderCsv(rows) {
  return toCsv(
    [
      { label: "Order ID", value: (row) => row.id },
      { label: "Order Number", value: (row) => row.orderNumber },
      { label: "Status", value: (row) => row.status },
      { label: "Order Date", value: (row) => row.orderDate },
      { label: "Delivery Date", value: (row) => row.deliveryDate },
      { label: "Customer", value: (row) => row.customer.companyName || row.customer.fullName },
      { label: "Customer Email", value: (row) => row.customer.email },
      { label: "Grand Total", value: (row) => row.grandTotal },
      { label: "Notes", value: (row) => row.notes }
    ],
    rows
  );
}

function getInvoiceCsv(rows) {
  return toCsv(
    [
      { label: "Invoice ID", value: (row) => row.id },
      { label: "Invoice Number", value: (row) => row.invoiceNumber },
      { label: "Status", value: (row) => row.status },
      { label: "Issue Date", value: (row) => row.issueDate },
      { label: "Due Date", value: (row) => row.dueDate },
      { label: "Customer", value: (row) => row.customer.companyName || row.customer.fullName },
      { label: "Customer Email", value: (row) => row.customer.email },
      { label: "Grand Total", value: (row) => row.grandTotal },
      { label: "Balance Due", value: (row) => row.balanceDue },
      { label: "Notes", value: (row) => row.notes }
    ],
    rows
  );
}

function getPaymentCsv(rows) {
  return toCsv(
    [
      { label: "Payment ID", value: (row) => row.id },
      { label: "Payment Date", value: (row) => row.paymentDate },
      { label: "Payment Method", value: (row) => row.paymentMethod },
      { label: "Reference Number", value: (row) => row.referenceNumber },
      { label: "Customer", value: (row) => row.customer.companyName || row.customer.fullName },
      { label: "Customer Email", value: (row) => row.customer.email },
      { label: "Invoice Number", value: (row) => row.invoice?.invoiceNumber },
      { label: "Amount", value: (row) => row.amount },
      { label: "Notes", value: (row) => row.notes }
    ],
    rows
  );
}

function getStatementCsv(statement) {
  return toCsv(
    [
      { label: "Entry ID", value: (row) => row.id },
      { label: "Entry Date", value: (row) => row.entryDate },
      { label: "Entry Type", value: (row) => row.entryType },
      { label: "Source Type", value: (row) => row.sourceType },
      { label: "Invoice Number", value: (row) => row.invoice?.invoiceNumber },
      { label: "Payment Reference", value: (row) => row.payment?.referenceNumber },
      { label: "Amount", value: (row) => row.amount },
      { label: "Running Balance", value: (row) => row.runningBalance },
      { label: "Notes", value: (row) => row.notes }
    ],
    statement.items
  );
}

async function getVendorSummaryReport(vendorId, query) {
  const metrics = await getVendorSummaryMetrics(vendorId, query);

  return {
    vendorId,
    period: {
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null
    },
    metrics: {
      totalCustomers: metrics.total_customers,
      totalProducts: metrics.total_products,
      totalQuotations: metrics.total_quotations,
      totalOrders: metrics.total_orders,
      orderTotal: metrics.order_total,
      totalInvoices: metrics.total_invoices,
      invoiceTotal: metrics.invoice_total,
      totalPayments: metrics.total_payments,
      paymentTotal: metrics.payment_total,
      outstandingReceivables: metrics.outstanding_receivables,
      totalRoutes: metrics.total_routes
    }
  };
}

async function getOrderReport(vendorId, query, exportMode = false) {
  const pagination = exportMode ? { page: 1, pageSize: EXPORT_LIMIT, limit: EXPORT_LIMIT, offset: 0 } : getPagination(query);
  const result = await listOrderReportRows({
    vendorId,
    customerId: query.customerId || null,
    status: query.status || null,
    search: query.search || null,
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    deliveryDateFrom: query.deliveryDateFrom || null,
    deliveryDateTo: query.deliveryDateTo || null,
    limit: pagination.limit,
    offset: pagination.offset
  });

  return buildReportResponse(result.rows, result.total, pagination, query, mapOrderReportRow);
}

async function getInvoiceReport(vendorId, query, exportMode = false) {
  const pagination = exportMode ? { page: 1, pageSize: EXPORT_LIMIT, limit: EXPORT_LIMIT, offset: 0 } : getPagination(query);
  const result = await listInvoiceReportRows({
    vendorId,
    customerId: query.customerId || null,
    orderId: query.orderId || null,
    status: query.status || null,
    search: query.search || null,
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    dueDateFrom: query.dueDateFrom || null,
    dueDateTo: query.dueDateTo || null,
    limit: pagination.limit,
    offset: pagination.offset
  });

  return buildReportResponse(result.rows, result.total, pagination, query, mapInvoiceReportRow);
}

async function getPaymentReport(vendorId, query, exportMode = false) {
  const pagination = exportMode ? { page: 1, pageSize: EXPORT_LIMIT, limit: EXPORT_LIMIT, offset: 0 } : getPagination(query);
  const result = await listPaymentReportRows({
    vendorId,
    customerId: query.customerId || null,
    invoiceId: query.invoiceId || null,
    paymentMethod: query.paymentMethod || null,
    search: query.search || null,
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    limit: pagination.limit,
    offset: pagination.offset
  });

  return buildReportResponse(result.rows, result.total, pagination, query, mapPaymentReportRow);
}

async function getCustomerStatementReport(vendorId, customerId, query) {
  const relationship = await findCustomerRelationshipForVendor(vendorId, customerId);

  if (!relationship) {
    throw new AppError("Customer is not linked to this vendor", {
      statusCode: 404,
      code: "CUSTOMER_NOT_FOUND_FOR_VENDOR",
      details: [
        {
          path: "customerId",
          message: "Statements can only be generated for customers linked to the current vendor"
        }
      ]
    });
  }

  const openingBalance = await getStatementOpeningBalance(vendorId, customerId, query.dateFrom || null);
  let runningBalance = openingBalance;
  const entries = await listStatementEntriesForVendor(vendorId, customerId, query);
  const items = entries.map((entry) => {
    const amount = toNumber(entry.amount);
    runningBalance += entry.entry_type === "debit" ? amount : -amount;

    return mapStatementEntry(entry, Number(runningBalance.toFixed(2)));
  });

  return {
    vendorId,
    customer: mapCustomer(relationship),
    period: {
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null
    },
    openingBalance: Number(openingBalance.toFixed(2)),
    endingBalance: Number(runningBalance.toFixed(2)),
    items
  };
}

async function getAdminOverviewReport() {
  const metrics = await getAdminOverviewMetrics();

  return {
    vendors: {
      total: metrics.total_vendors,
      active: metrics.active_vendors
    },
    subscriptions: {
      live: metrics.live_subscriptions,
      active: metrics.active_subscriptions
    },
    operations: {
      totalOrders: metrics.total_orders,
      orderTotal: metrics.order_total,
      totalInvoices: metrics.total_invoices,
      invoiceTotal: metrics.invoice_total,
      outstandingReceivables: metrics.outstanding_receivables,
      totalPayments: metrics.total_payments,
      paymentTotal: metrics.payment_total
    }
  };
}

async function getOrderCsvExport(vendorId, query) {
  const report = await getOrderReport(vendorId, query, true);

  return getOrderCsv(report.items);
}

async function getInvoiceCsvExport(vendorId, query) {
  const report = await getInvoiceReport(vendorId, query, true);

  return getInvoiceCsv(report.items);
}

async function getPaymentCsvExport(vendorId, query) {
  const report = await getPaymentReport(vendorId, query, true);

  return getPaymentCsv(report.items);
}

async function getCustomerStatementCsvExport(vendorId, customerId, query) {
  const statement = await getCustomerStatementReport(vendorId, customerId, query);

  return getStatementCsv(statement);
}

export {
  getAdminOverviewReport,
  getCustomerStatementCsvExport,
  getCustomerStatementReport,
  getInvoiceCsvExport,
  getInvoiceReport,
  getOrderCsvExport,
  getOrderReport,
  getPaymentCsvExport,
  getPaymentReport,
  getVendorSummaryReport
};
