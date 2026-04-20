import { sendSuccess } from "../../core/http/apiResponse.js";
import { getCreateContext, getNotificationPanel, getVendorUiDashboard } from "./ui.service.js";

async function dashboard(request, response) {
  const result = await getVendorUiDashboard(request.access.vendorId, request.auth.userId, {
    includeNotifications: request.query.includeNotifications
  });

  sendSuccess(response, {
    message: "Dashboard helper loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function createContext(request, response) {
  const result = await getCreateContext(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Create context helper loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function notificationsPanel(request, response) {
  const result = await getNotificationPanel(request.auth.userId, request.query);

  sendSuccess(response, {
    message: "Notifications panel helper loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

export { createContext, dashboard, notificationsPanel };
