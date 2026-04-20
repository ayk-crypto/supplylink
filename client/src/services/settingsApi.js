import { request } from "./httpClient.js";

async function getSettings(options = {}) {
  return request("/settings", options);
}

async function updateSettings(payload, options = {}) {
  return request("/settings", {
    ...options,
    body: payload,
    method: "PATCH"
  });
}

export { getSettings, updateSettings };
