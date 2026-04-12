import { request } from "./httpClient.js";

async function getDashboard() {
  return request("/ui/dashboard");
}

async function getNotificationsPanel() {
  return request("/ui/notifications-panel?limit=6");
}

export { getDashboard, getNotificationsPanel };
