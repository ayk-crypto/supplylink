import env from "../config/env.js";
import { getStoredToken, request } from "./httpClient.js";

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

async function fetchVendorLogoBlob(options = {}) {
  const token = options.token ?? getStoredToken();
  const response = await fetch(`${env.apiBaseUrl}/settings/logo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: options.signal
  });

  if (!response.ok) {
    const error = new Error(`Logo request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export {
  deleteVendorLogo,
  fetchVendorLogoBlob,
  getSettings,
  updateSettings,
  uploadVendorLogo
};
