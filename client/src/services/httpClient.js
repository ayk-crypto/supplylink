import env from "../config/env.js";

const TOKEN_STORAGE_KEY = "supplylink.accessToken";

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setStoredToken(token) {
  if (!token) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

async function request(path, options = {}) {
  const { token: requestToken, ...fetchOptions } = options;
  const token = requestToken ?? getStoredToken();
  const headers = {
    ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {})
  };
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers,
    body:
      fetchOptions.body &&
      !(fetchOptions.body instanceof FormData) &&
      typeof fetchOptions.body !== "string"
        ? JSON.stringify(fetchOptions.body)
        : fetchOptions.body
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || `API request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export { getStoredToken, request, setStoredToken, TOKEN_STORAGE_KEY };
