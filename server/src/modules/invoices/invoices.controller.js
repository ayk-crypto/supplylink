import { sendSuccess } from "../../core/http/apiResponse.js";
import {
  createInvoice,
  getInvoiceDetail,
  getInvoiceDirectory,
  transitionInvoice,
  updateInvoice
} from "./invoices.service.js";
import {
  buildInvoicePdfDocument,
  buildInvoicePrintDocument
} from "../documents/documents.service.js";
import {
  sendInvoiceEmail,
} from "../documents/documents.email.service.js";
import {
  ensureDocumentShare,
  getDocumentShareSummary,
  regenerateDocumentShare,
  revokeActiveDocumentShare
} from "../documents/documents.share.service.js";

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
  const [invoice, sharing] = await Promise.all([
    getInvoiceDetail(request.access.vendorId, request.params.invoiceId),
    getDocumentShareSummary(request.access.vendorId, "invoice", request.params.invoiceId)
  ]);

  sendSuccess(response, {
    message: "Invoice loaded",
    data: {
      ...invoice,
      sharing
    },
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function print(request, response) {
  const result = await buildInvoicePrintDocument(request.access.vendorId, request.params.invoiceId);

  sendSuccess(response, {
    message: "Invoice print document loaded",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      output: "structured-json"
    }
  });
}

async function pdf(request, response) {
  const result = await buildInvoicePdfDocument(request.access.vendorId, request.params.invoiceId);

  response.setHeader("Content-Type", result.contentType);
  response.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");

  return response.send(result.buffer);
}

async function share(request, response) {
  const result = await ensureDocumentShare(
    request.access.vendorId,
    "invoice",
    request.params.invoiceId,
    request.auth
  );

  sendSuccess(response, {
    message: "Invoice share link ready",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function revokeShare(request, response) {
  const result = await revokeActiveDocumentShare(
    request.access.vendorId,
    "invoice",
    request.params.invoiceId,
    request.auth
  );

  sendSuccess(response, {
    message: "Invoice share link revoked",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function regenerateShare(request, response) {
  const result = await regenerateDocumentShare(
    request.access.vendorId,
    "invoice",
    request.params.invoiceId,
    request.auth
  );

  sendSuccess(response, {
    message: "Invoice share link regenerated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId
    }
  });
}

async function email(request, response) {
  const result = await sendInvoiceEmail(
    request.access.vendorId,
    request.params.invoiceId,
    request.body,
    request.auth
  );

  sendSuccess(response, {
    message: "Invoice email sent",
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

async function transition(action, request, response) {
  const result = await transitionInvoice(
    request.access.vendorId,
    request.params.invoiceId,
    action,
    request.auth
  );

  sendSuccess(response, {
    message: "Invoice status updated",
    data: result,
    meta: {
      requestId: request.context.requestId,
      vendorId: request.access.vendorId,
      action
    }
  });
}

async function issue(request, response) {
  return transition("issue", request, response);
}

async function voidInvoice(request, response) {
  return transition("void", request, response);
}

export {
  create,
  email,
  getById,
  issue,
  list,
  pdf,
  print,
  regenerateShare,
  revokeShare,
  share,
  update,
  voidInvoice
};
