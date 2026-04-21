import { request } from "./httpClient.js";

async function shareQuotation(quotationId) {
  return request(`/quotations/${quotationId}/share`, {
    method: "POST"
  });
}

async function shareInvoice(invoiceId) {
  return request(`/invoices/${invoiceId}/share`, {
    method: "POST"
  });
}

async function getSharedDocument(token, options = {}) {
  return request(`/public/documents/${token}`, options);
}

async function downloadSharedDocumentPdf(token, options = {}) {
  return request(`/public/documents/${token}/pdf`, {
    ...options,
    responseType: "blob"
  });
}

export {
  downloadSharedDocumentPdf,
  getSharedDocument,
  shareInvoice,
  shareQuotation
};
