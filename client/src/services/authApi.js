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

async function getCurrentUser() {
  return request("/auth/me");
}

export { getCurrentUser, loginUser };
