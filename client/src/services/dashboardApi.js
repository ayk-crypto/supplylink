import { request } from "./httpClient.js";

async function getDashboard({ includeNotifications = true, signal } = {}) {
  const params = new URLSearchParams();

  if (!includeNotifications) {
    params.set("includeNotifications", "false");
  }

  const query = params.toString();

  return request(`/ui/dashboard${query ? `?${query}` : ""}`, { signal });
}

async function getNotificationsPanel({ signal } = {}) {
  return request("/ui/notifications-panel?limit=6", { signal });
}

export { getDashboard, getNotificationsPanel };
