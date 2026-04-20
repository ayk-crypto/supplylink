import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createPayment,
  getPaymentDetail,
  getPaymentDirectory,
  updatePayment
} from "./ledger.service.js";

async function list(request, response) {
  const result = await getPaymentDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Payments loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getPaymentDetail(request.access.vendorId, request.params.paymentId);

  sendSuccess(response, {
    message: "Payment loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createPayment(request.access.vendorId, request.body, request.auth);

  sendSuccess(response, {
    statusCode: 201,
    message: "Payment created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updatePayment(request.access.vendorId, request.params.paymentId, request.body);

  sendSuccess(response, {
    message: "Payment updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
