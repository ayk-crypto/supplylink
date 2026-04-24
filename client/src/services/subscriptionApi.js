import { request } from "./httpClient.js";

async function getSubscription(options = {}) {
  return request("/subscription", options);
}

async function upgradeSubscription(plan, options = {}) {
  return request("/subscription/upgrade", {
    ...options,
    method: "POST",
    body: { plan }
  });
}

async function cancelSubscription(options = {}) {
  return request("/subscription/cancel", {
    ...options,
    method: "POST",
    body: {}
  });
}

export { cancelSubscription, getSubscription, upgradeSubscription };
