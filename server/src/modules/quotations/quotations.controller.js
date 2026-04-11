import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createQuotation,
  getQuotationDetail,
  getQuotationDirectory,
  updateQuotation
} from "./quotations.service.js";

async function list(request, response) {
  const result = await getQuotationDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Quotations loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getQuotationDetail(request.access.vendorId, request.params.quotationId);

  sendSuccess(response, {
    message: "Quotation loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createQuotation(request.access.vendorId, request.body, request.auth);

  sendSuccess(response, {
    statusCode: 201,
    message: "Quotation created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateQuotation(
    request.access.vendorId,
    request.params.quotationId,
    request.body
  );

  sendSuccess(response, {
    message: "Quotation updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
