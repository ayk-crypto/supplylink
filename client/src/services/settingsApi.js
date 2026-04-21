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

async function uploadVendorLogo(file) {
  const body = new FormData();
  body.append("file", file);
  return request("/settings/logo", {
    method: "POST",
    body
  });
}

async function deleteVendorLogo() {
  return request("/settings/logo", {
    method: "DELETE"
  });
}

export { deleteVendorLogo, getSettings, updateSettings, uploadVendorLogo };
