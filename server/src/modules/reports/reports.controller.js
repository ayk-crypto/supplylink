import { sendSuccess } from "../../core/http/apiResponse.js";
import {
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
} from "./reports.service.js";

function sendCsv(response, { filename, csv }) {
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  return response.status(200).send(csv);
}

async function summary(request, response) {
  const result = await getVendorSummaryReport(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Vendor summary report loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function orders(request, response) {
  const result = await getOrderReport(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Order report loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function invoices(request, response) {
  const result = await getInvoiceReport(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Invoice report loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function payments(request, response) {
  const result = await getPaymentReport(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Payment report loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function customerStatement(request, response) {
  const result = await getCustomerStatementReport(
    request.access.vendorId,
    request.params.customerId,
    request.query
  );

  sendSuccess(response, {
    message: "Customer statement report loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function adminOverview(request, response) {
  const result = await getAdminOverviewReport();

  sendSuccess(response, {
    message: "Admin overview report loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function ordersCsv(request, response) {
  const csv = await getOrderCsvExport(request.access.vendorId, request.query);

  return sendCsv(response, {
    filename: "orders-report.csv",
    csv
  });
}

async function invoicesCsv(request, response) {
  const csv = await getInvoiceCsvExport(request.access.vendorId, request.query);

  return sendCsv(response, {
    filename: "invoices-report.csv",
    csv
  });
}

async function paymentsCsv(request, response) {
  const csv = await getPaymentCsvExport(request.access.vendorId, request.query);

  return sendCsv(response, {
    filename: "payments-report.csv",
    csv
  });
}

async function customerStatementCsv(request, response) {
  const csv = await getCustomerStatementCsvExport(
    request.access.vendorId,
    request.params.customerId,
    request.query
  );

  return sendCsv(response, {
    filename: `customer-statement-${request.params.customerId}.csv`,
    csv
  });
}

export {
  adminOverview,
  customerStatement,
  customerStatementCsv,
  invoices,
  invoicesCsv,
  orders,
  ordersCsv,
  payments,
  paymentsCsv,
  summary
};
