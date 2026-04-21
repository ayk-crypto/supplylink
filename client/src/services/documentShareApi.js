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

async function revokeQuotationShare(quotationId) {
  return request(`/quotations/${quotationId}/share/revoke`, {
    method: "POST"
  });
}

async function regenerateQuotationShare(quotationId) {
  return request(`/quotations/${quotationId}/share/regenerate`, {
    method: "POST"
  });
}

async function revokeInvoiceShare(invoiceId) {
  return request(`/invoices/${invoiceId}/share/revoke`, {
    method: "POST"
  });
}

async function regenerateInvoiceShare(invoiceId) {
  return request(`/invoices/${invoiceId}/share/regenerate`, {
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
  regenerateInvoiceShare,
  regenerateQuotationShare,
  revokeInvoiceShare,
  revokeQuotationShare,
  shareInvoice,
  shareQuotation
};
