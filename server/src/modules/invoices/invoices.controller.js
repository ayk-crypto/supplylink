import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createInvoice,
  getInvoiceDetail,
  getInvoiceDirectory,
  updateInvoice
} from "./invoices.service.js";

async function list(request, response) {
  const result = await getInvoiceDirectory(request.access.vendorId, request.query);

  sendSuccess(response, {
    message: "Invoices loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function getById(request, response) {
  const result = await getInvoiceDetail(request.access.vendorId, request.params.invoiceId);

  sendSuccess(response, {
    message: "Invoice loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function create(request, response) {
  const result = await createInvoice(request.access.vendorId, request.body, request.auth);

  sendSuccess(response, {
    statusCode: 201,
    message: "Invoice created",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function update(request, response) {
  const result = await updateInvoice(
    request.access.vendorId,
    request.params.invoiceId,
    request.body
  );

  sendSuccess(response, {
    message: "Invoice updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

export { create, getById, list, update };
