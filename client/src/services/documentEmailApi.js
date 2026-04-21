import { request } from "./httpClient.js";

async function sendQuotationEmail(quotationId, payload) {
  return request(`/quotations/${quotationId}/email`, {
    method: "POST",
    body: payload
  });
}

async function sendInvoiceEmail(invoiceId, payload) {
  return request(`/invoices/${invoiceId}/email`, {
    method: "POST",
    body: payload
  });
}

export { sendInvoiceEmail, sendQuotationEmail };
