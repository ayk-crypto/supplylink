import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listBillingPlans(options = {}) {
  return request("/admin/billing/plans", options);
}

async function updateBillingPlan(planCode, payload, options = {}) {
  return request(`/admin/billing/plans/${planCode}`, {
    ...options,
    method: "PATCH",
    body: payload
  });
}

async function listAdminSubscriptions(params = {}, options = {}) {
  const query = toQueryString(params);
  return request(`/admin/billing/subscriptions${query}`, options);
}

async function updateAdminSubscription(vendorId, payload, options = {}) {
  return request(`/admin/billing/subscriptions/${vendorId}`, {
    ...options,
    method: "PATCH",
    body: payload
  });
}

async function listBillingPayments(params = {}, options = {}) {
  const query = toQueryString(params);
  return request(`/admin/billing/payments${query}`, options);
}

async function createBillingPayment(payload, options = {}) {
  return request("/admin/billing/payments", {
    ...options,
    method: "POST",
    body: payload
  });
}

export {
  createBillingPayment,
  listAdminSubscriptions,
  listBillingPayments,
  listBillingPlans,
  updateAdminSubscription,
  updateBillingPlan
};
