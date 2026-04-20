import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  getNotificationDetail,
  getNotificationDirectory,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead
} from "./notifications.service.js";

async function list(request, response) {
  const result = await getNotificationDirectory(request.auth.userId, request.query);

  sendSuccess(response, {
    message: "Notifications loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function unreadCount(request, response) {
  const result = await getUnreadNotificationCount(request.auth.userId);

  sendSuccess(response, {
    message: "Unread notification count loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function getById(request, response) {
  const result = await getNotificationDetail(request.auth.userId, request.params.notificationId);

  sendSuccess(response, {
    message: "Notification loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function markRead(request, response) {
  const result = await markNotificationRead(request.auth.userId, request.params.notificationId);

  sendSuccess(response, {
    message: "Notification marked as read",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function markAllRead(request, response) {
  const result = await markAllNotificationsRead(request.auth.userId);

  sendSuccess(response, {
    message: "Notifications marked as read",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

export { getById, list, markAllRead, markRead, unreadCount };
