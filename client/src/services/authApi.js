import { request } from "./httpClient.js";

async function loginUser({ email, password, vendorId }) {
  return request("/auth/login", {
    method: "POST",
    body: {
      email,
      password,
      ...(vendorId ? { vendorId } : {})
    }
  });
}

async function getCurrentUser(options = {}) {
  return request("/auth/me", options);
}

export { getCurrentUser, loginUser };
