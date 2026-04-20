import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createOrder,
  getOrderDetail,
  getOrderDirectory,
  transitionOrder,
  updateOrder
} from "./orders.service.js";
import { convertOrderToInvoice } from "../invoices/invoices.service.js";

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

async function transition(action, request, response) {
  const result = await transitionOrder(
    request.access.vendorId,
    request.params.orderId,
    action,
    request.auth
  );

  sendSuccess(response, {
    message: "Order status updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      action
    }
  });
}

async function createInvoiceFromOrder(request, response) {
  const result = await convertOrderToInvoice(
    request.access.vendorId,
    request.params.orderId,
    request.auth
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Order converted to invoice",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      sourceOrderId: request.params.orderId
    }
  });
}

async function confirm(request, response) {
  return transition("confirm", request, response);
}

async function pack(request, response) {
  return transition("pack", request, response);
}

async function dispatch(request, response) {
  return transition("dispatch", request, response);
}

async function deliver(request, response) {
  return transition("deliver", request, response);
}

async function cancel(request, response) {
  return transition("cancel", request, response);
}

export {
  cancel,
  confirm,
  create,
  createInvoiceFromOrder,
  deliver,
  dispatch,
  getById,
  list,
  pack,
  update
};
