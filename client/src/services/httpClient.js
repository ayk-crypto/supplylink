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
  const { responseType = "json", token: requestToken, ...fetchOptions } = options;
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

  const contentType = response.headers.get("Content-Type") || "";
  let payload = null;

  if (responseType === "blob") {
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    } else {
      payload = await response.blob().catch(() => null);
    }
  } else if (responseType === "text") {
    payload = await response.text().catch(() => null);
  } else {
    payload = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const errorMessage =
      responseType === "json" || (payload && typeof payload === "object" && "message" in payload)
        ? payload?.message || `API request failed with status ${response.status}`
        : `API request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (responseType === "json") {
    return payload;
  }

  return {
    data: payload,
    headers: {
      contentDisposition: response.headers.get("Content-Disposition"),
      contentType
    },
    status: response.status
  };
}

export { getStoredToken, request, setStoredToken, TOKEN_STORAGE_KEY };
