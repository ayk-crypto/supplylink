import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listInventoryProducts(params = {}, options = {}) {
  return request(`/inventory/products${toQueryString(params)}`, options);
}

async function getInventoryProduct(productId, options = {}) {
  return request(`/inventory/products/${productId}`, options);
}

async function listStockMovements(params = {}, options = {}) {
  return request(`/inventory/movements${toQueryString(params)}`, options);
}

async function adjustInventory(payload) {
  return request("/inventory/adjust", {
    method: "POST",
    body: payload
  });
}

export { adjustInventory, getInventoryProduct, listInventoryProducts, listStockMovements };
