import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  getAdminSubscriptions,
  getBillingPayments,
  getBillingPlans,
  recordManualSubscriptionPayment,
  updateBillingPlan,
  updateVendorSubscriptionByAdmin
} from "../subscriptions/subscriptions.service.js";

async function listPlans(request, response) {
  const result = await getBillingPlans();

  sendSuccess(response, {
    message: "Billing plans loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function updatePlan(request, response) {
  const result = await updateBillingPlan(
    request.params.planCode,
    request.body,
    request.auth,
    request.context.requestId
  );

  sendSuccess(response, {
    message: "Billing plan updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      planCode: request.params.planCode
    }
  });
}

async function listSubscriptions(request, response) {
  const result = await getAdminSubscriptions(request.query);

  sendSuccess(response, {
    message: "Vendor subscriptions loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function updateSubscription(request, response) {
  const result = await updateVendorSubscriptionByAdmin(
    request.params.vendorId,
    request.body,
    request.auth,
    request.context.requestId
  );

  sendSuccess(response, {
    message: "Vendor subscription updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.params.vendorId
    }
  });
}

async function listPayments(request, response) {
  const result = await getBillingPayments(request.query);

  sendSuccess(response, {
    message: "Billing payment history loaded",
    data: result,
    meta: {
      requestId: request.context.requestId
    }
  });
}

async function createPayment(request, response) {
  const result = await recordManualSubscriptionPayment(
    request.body,
    request.auth,
    request.context.requestId
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Manual payment recorded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.body.vendorId
    }
  });
}

export {
  createPayment,
  listPayments,
  listPlans,
  listSubscriptions,
  updatePlan,
  updateSubscription
};
