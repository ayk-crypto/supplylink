import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listInvoices(params = {}, options = {}) {
  return request(`/invoices${toQueryString(params)}`, options);
}

async function getInvoice(invoiceId, options = {}) {
  return request(`/invoices/${invoiceId}`, options);
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

export { createPayment, getInvoice, listInvoices, listPayments };
