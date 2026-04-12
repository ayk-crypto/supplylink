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
  const token = options.token ?? getStoredToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData) && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body
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
