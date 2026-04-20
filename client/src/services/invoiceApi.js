import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listInvoices(params = {}, options = {}) {
  return request(`/invoices${toQueryString(params)}`, options);
}

async function getInvoice(invoiceId, options = {}) {
  return request(`/invoices/${invoiceId}`, options);
}

async function createInvoice(payload) {
  return request("/invoices", {
    method: "POST",
    body: payload
  });
}

async function createInvoiceFromOrder(orderId, payload = {}) {
  return createInvoice({
    ...payload,
    orderId
  });
}

async function getInvoicePrintDocument(invoiceId, options = {}) {
  return request(`/invoices/${invoiceId}/print`, options);
}

async function listPayments(params = {}, options = {}) {
  return request(`/payments${toQueryString(params)}`, options);
}

async function createPayment(payload) {
  return request("/payments", {
    method: "POST",
    body: payload
  });
}

async function transitionInvoice(invoiceId, action) {
  return request(`/invoices/${invoiceId}/${action}`, {
    method: "POST"
  });
}

export {
  createInvoice,
  createInvoiceFromOrder,
  createPayment,
  getInvoice,
  getInvoicePrintDocument,
  listInvoices,
  listPayments,
  transitionInvoice
};
