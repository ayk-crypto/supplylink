import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listAdminVendors(params = {}, options = {}) {
  const query = toQueryString(params);
  return request(`/vendors${query}`, options);
}

async function createAdminVendor(payload, options = {}) {
  return request("/vendors", {
    ...options,
    method: "POST",
    body: payload
  });
}

export { createAdminVendor, listAdminVendors };
