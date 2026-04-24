import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  cancelCurrentVendorSubscription,
  extendVendorTrial,
  getCurrentVendorSubscription,
  upgradeCurrentVendorSubscription
} from "./subscriptions.service.js";

async function getMe(request, response) {
  const result = await getCurrentVendorSubscription(request.access.vendorId);

  sendSuccess(response, {
    message: "Subscription loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function upgrade(request, response) {
  const result = await upgradeCurrentVendorSubscription(request.access.vendorId, request.body.plan);

  sendSuccess(response, {
    message: "Subscription upgraded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function cancel(request, response) {
  const result = await cancelCurrentVendorSubscription(request.access.vendorId);

  sendSuccess(response, {
    message: "Subscription cancelled",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function extendTrial(request, response) {
  const result = await extendVendorTrial(request.body.vendorId, request.body.days);

  sendSuccess(response, {
    message: "Trial extended",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.body.vendorId
    }
  });
}

export { cancel, extendTrial, getMe, upgrade };
