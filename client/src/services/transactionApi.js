import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listQuotations(params = {}, options = {}) {
  return request(`/quotations${toQueryString(params)}`, options);
}

async function getQuotation(quotationId, options = {}) {
  return request(`/quotations/${quotationId}`, options);
}

async function createQuotation(payload) {
  return request("/quotations", {
    method: "POST",
    body: payload
  });
}

async function listOrders(params = {}, options = {}) {
  return request(`/orders${toQueryString(params)}`, options);
}

async function getOrder(orderId, options = {}) {
  return request(`/orders/${orderId}`, options);
}

async function createOrder(payload) {
  return request("/orders", {
    method: "POST",
    body: payload
  });
}

async function convertQuotationToOrder(quotationId) {
  return request(`/quotations/${quotationId}/convert-to-order`, {
    method: "POST"
  });
}

async function transitionQuotation(quotationId, action) {
  return request(`/quotations/${quotationId}/${action}`, {
    method: "POST"
  });
}

async function transitionOrder(orderId, action) {
  return request(`/orders/${orderId}/${action}`, {
    method: "POST"
  });
}

export {
  convertQuotationToOrder,
  createOrder,
  createQuotation,
  getOrder,
  getQuotation,
  listOrders,
  listQuotations,
  transitionOrder,
  transitionQuotation
};
