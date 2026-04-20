import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listCustomers(params = {}, options = {}) {
  return request(`/customers${toQueryString(params)}`, options);
}

async function getCustomer(customerId, options = {}) {
  return request(`/customers/${customerId}`, options);
}

async function createCustomer(payload) {
  return request("/customers", {
    method: "POST",
    body: payload
  });
}

async function updateCustomer(customerId, payload) {
  return request(`/customers/${customerId}`, {
    method: "PATCH",
    body: payload
  });
}

async function listCategories(params = {}, options = {}) {
  return request(`/categories${toQueryString(params)}`, options);
}

async function createCategory(payload) {
  return request("/categories", {
    method: "POST",
    body: payload
  });
}

async function updateCategory(categoryId, payload) {
  return request(`/categories/${categoryId}`, {
    method: "PATCH",
    body: payload
  });
}

async function listProducts(params = {}, options = {}) {
  return request(`/products${toQueryString(params)}`, options);
}

async function createProduct(payload) {
  return request("/products", {
    method: "POST",
    body: payload
  });
}

async function updateProduct(productId, payload) {
  return request(`/products/${productId}`, {
    method: "PATCH",
    body: payload
  });
}

export {
  createCategory,
  createCustomer,
  createProduct,
  getCustomer,
  listCategories,
  listCustomers,
  listProducts,
  updateCategory,
  updateCustomer,
  updateProduct
};
