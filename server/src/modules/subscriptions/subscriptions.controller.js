import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  changeVendorStatus,
  createVendorSubscription,
  getAdminVendorOverview,
  getCurrentVendorSubscription,
  getSubscriptionDetail,
  getSubscriptionDirectory,
  updateVendorSubscription
} from "./subscriptions.service.js";

async function list(request, response) {
  const result = await getSubscriptionDirectory(request.query);

  sendSuccess(response, {
    message: "Subscriptions loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function getById(request, response) {
  const result = await getSubscriptionDetail(request.params.subscriptionId);

  sendSuccess(response, {
    message: "Subscription loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function create(request, response) {
  const result = await createVendorSubscription(request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: "Subscription created",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function update(request, response) {
  const result = await updateVendorSubscription(request.params.subscriptionId, request.body);

  sendSuccess(response, {
    message: "Subscription updated",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function getMe(request, response) {
  const result = await getCurrentVendorSubscription(request.access.vendorId);

  sendSuccess(response, {
    message: "Current vendor subscription loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function updateVendorStatus(request, response) {
  const result = await changeVendorStatus(request.params.vendorId, request.body);

  sendSuccess(response, {
    message: "Vendor status updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.params.vendorId
    }
  });
}

async function getVendorOverview(request, response) {
  const result = await getAdminVendorOverview(request.params.vendorId);

  sendSuccess(response, {
    message: "Admin vendor overview loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.params.vendorId
    }
  });
}

export { create, getById, getMe, getVendorOverview, list, update, updateVendorStatus };
