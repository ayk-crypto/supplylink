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

export {
  getNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
