import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createCustomerForVendor,
  getCustomerDetail,
  getCustomerDirectory,
  updateCustomerForCurrentVendor
} from "./customers.service.js";

async function list(request, response) {
  const result = await getCustomerDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Customers loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getCustomerDetail(request.access.vendorId, request.params.customerId);

  sendSuccess(response, {
    message: "Customer loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createCustomerForVendor(request.access.vendorId, request.body);

  sendSuccess(response, {
    statusCode: 201,
    message: result.reusedCustomer ? "Existing customer linked" : "Customer created",
    data: {
      customer: result.customer,
      relationship: result.relationship
    },
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      reusedCustomer: result.reusedCustomer
    }
  });
}

async function update(request, response) {
  const result = await updateCustomerForCurrentVendor(
    request.access.vendorId,
    request.params.customerId,
    request.body
  );

  sendSuccess(response, {
    message: "Customer updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
