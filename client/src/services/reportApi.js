import env from "../config/env.js";
import { getStoredToken, request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function getReportSummary(params = {}, options = {}) {
  return request(`/reports/summary${toQueryString(params)}`, options);
}

async function listOrderReport(params = {}, options = {}) {
  return request(`/reports/orders${toQueryString(params)}`, options);
}

async function listInvoiceReport(params = {}, options = {}) {
  return request(`/reports/invoices${toQueryString(params)}`, options);
}

async function listPaymentReport(params = {}, options = {}) {
  return request(`/reports/payments${toQueryString(params)}`, options);
}

async function getCustomerStatementReport(customerId, params = {}, options = {}) {
  return request(`/reports/customer-statement/${customerId}${toQueryString(params)}`, options);
}

async function downloadCsv(path, params = {}, filename = "report.csv") {
  const token = getStoredToken();
  const response = await fetch(`${env.apiBaseUrl}${path}${toQueryString(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || `Export failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

async function exportOrdersCsv(params = {}) {
  return downloadCsv("/reports/exports/orders.csv", params, "orders-report.csv");
}

async function exportInvoicesCsv(params = {}) {
  return downloadCsv("/reports/exports/invoices.csv", params, "invoices-report.csv");
}

async function exportPaymentsCsv(params = {}) {
  return downloadCsv("/reports/exports/payments.csv", params, "payments-report.csv");
}

async function exportCustomerStatementCsv(customerId, params = {}) {
  return downloadCsv(
    `/reports/exports/customer-statement/${customerId}.csv`,
    params,
    `customer-statement-${customerId}.csv`
  );
}

export {
  exportCustomerStatementCsv,
  exportInvoicesCsv,
  exportOrdersCsv,
  exportPaymentsCsv,
  getCustomerStatementReport,
  getReportSummary,
  listInvoiceReport,
  listOrderReport,
  listPaymentReport
};
