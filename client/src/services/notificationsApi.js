import { request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listNotifications(params = {}, options = {}) {
  return request(`/notifications${toQueryString(params)}`, options);
}

async function getNotification(notificationId, options = {}) {
  return request(`/notifications/${notificationId}`, options);
}

async function getUnreadCount(options = {}) {
  return request("/notifications/unread-count", options);
}

async function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH"
  });
}

async function markAllNotificationsRead() {
  return request("/notifications/read-all", {
    method: "PATCH"
  });
}

async function bulkReadNotifications(notificationIds) {
  return request("/notifications/bulk-read", {
    method: "POST",
    body: { notificationIds }
  });
}

export {
  bulkReadNotifications,
  getNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
