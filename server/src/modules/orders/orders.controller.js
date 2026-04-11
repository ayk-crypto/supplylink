import { sendSuccess } from "../../core/http/apiResponse.js";
import { createOrder, getOrderDetail, getOrderDirectory, updateOrder } from "./orders.service.js";

async function list(request, response) {
  const result = await getOrderDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Orders loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getOrderDetail(request.access.vendorId, request.params.orderId);

  sendSuccess(response, {
    message: "Order loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createOrder(request.access.vendorId, request.body, request.auth);

  sendSuccess(response, {
    statusCode: 201,
    message: "Order created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateOrder(request.access.vendorId, request.params.orderId, request.body);

  sendSuccess(response, {
    message: "Order updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
