import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createQuotation,
  getQuotationDetail,
  getQuotationDirectory,
  transitionQuotation,
  updateQuotation
} from "./quotations.service.js";
import {
  buildQuotationPdfDocument,
  buildQuotationPrintDocument
} from "../documents/documents.service.js";
import {
  sendQuotationEmail,
} from "../documents/documents.email.service.js";
import {
  ensureDocumentShare,
  getDocumentShareSummary
} from "../documents/documents.share.service.js";
import { convertQuotationToOrder } from "../orders/orders.service.js";

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
  const [quotation, sharing] = await Promise.all([
    getQuotationDetail(request.access.vendorId, request.params.quotationId),
    getDocumentShareSummary(request.access.vendorId, "quotation", request.params.quotationId)
  ]);

  sendSuccess(response, {
    message: "Quotation loaded",
    data: {
      ...quotation,
      sharing
    },
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function print(request, response) {
  const result = await buildQuotationPrintDocument(
    request.access.vendorId,
    request.params.quotationId
  );

  sendSuccess(response, {
    message: "Quotation print document loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      output: "structured-json"
    }
  });
}

async function pdf(request, response) {
  const result = await buildQuotationPdfDocument(
    request.access.vendorId,
    request.params.quotationId
  );

  response.setHeader("Content-Type", result.contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

  return response.send(result.buffer);
}

async function share(request, response) {
  const result = await ensureDocumentShare(
    request.access.vendorId,
    "quotation",
    request.params.quotationId,
    request.auth
  );

  sendSuccess(response, {
    message: "Quotation share link ready",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function email(request, response) {
  const result = await sendQuotationEmail(
    request.access.vendorId,
    request.params.quotationId,
    request.body,
    request.auth
  );

  sendSuccess(response, {
    message: "Quotation email sent",
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

async function transition(action, request, response) {
  const result = await transitionQuotation(
    request.access.vendorId,
    request.params.quotationId,
    action,
    request.auth
  );

  sendSuccess(response, {
    message: "Quotation status updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      action
    }
  });
}

async function convertToOrder(request, response) {
  const result = await convertQuotationToOrder(
    request.access.vendorId,
    request.params.quotationId,
    request.auth
  );

  sendSuccess(response, {
    statusCode: 201,
    message: "Quotation converted to order",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      sourceQuotationId: request.params.quotationId
    }
  });
}

async function send(request, response) {
  return transition("send", request, response);
}

async function accept(request, response) {
  return transition("accept", request, response);
}

async function reject(request, response) {
  return transition("reject", request, response);
}

async function expire(request, response) {
  return transition("expire", request, response);
}

export {
  accept,
  convertToOrder,
  create,
  email,
  expire,
  getById,
  list,
  pdf,
  print,
  reject,
  send,
  share,
  update
};
