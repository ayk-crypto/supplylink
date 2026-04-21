import AppError from "../../core/errors/AppError.js";
import { findVendorById } from "../vendors/vendors.repository.js";
import { getQuotationDetail } from "../quotations/quotations.service.js";
import { getInvoiceDetail } from "../invoices/invoices.service.js";

const DOCUMENT_RENDER_VERSION = "2026-04-print-v1";

function toAmount(value) {
  return Number(value || 0);
}

function mapVendorBlock(vendor) {
  return {
    id: vendor.id,
    displayName: vendor.display_name,
    legalName: vendor.legal_name,
    slug: vendor.slug,
    contactEmail: vendor.contact_email,
    contactPhone: vendor.contact_phone,
    currencyCode: vendor.currency_code,
    timezone: vendor.timezone
  };
}

function mapCustomerBlock(customer) {
  return {
    id: customer.id,
    relationshipId: customer.relationshipId,
    accountCode: customer.accountCode,
    fullName: customer.fullName,
    companyName: customer.companyName,
    email: customer.email,
    phone: customer.phone
  };
}

function mapItemTable(items) {
  return items.map((item) => ({
    id: item.id,
    sequenceNumber: item.sequenceNumber,
    productId: item.productId,
    sku: item.product?.sku || item.metadata?.productSnapshot?.sku || null,
    productName: item.product?.name || item.metadata?.productSnapshot?.name || null,
    description: item.description,
    quantity: toAmount(item.quantity),
    unitPrice: toAmount(item.unitPrice),
    discountTotal: toAmount(item.discountTotal),
    taxTotal: toAmount(item.taxTotal),
    lineTotal: toAmount(item.lineTotal)
  }));
}

function buildTotalsBlock(record) {
  return {
    discountType: record.discountType || null,
    discountValue: toAmount(record.discountValue),
    discountAmount: toAmount(record.discountAmount),
    subtotal: toAmount(record.subtotal),
    discountTotal: toAmount(record.discountTotal),
    taxEnabled: Boolean(record.taxEnabled),
    taxRate: toAmount(record.taxRate),
    taxAmount: toAmount(record.taxAmount),
    taxTotal: toAmount(record.taxTotal),
    grandTotal: toAmount(record.grandTotal)
  };
}

function buildDocumentEnvelope({ documentType, documentNumber, vendor, customer, header, items, totals, notes }) {
  return {
    documentType,
    renderVersion: DOCUMENT_RENDER_VERSION,
    output: {
      format: "structured-json",
      renderTargets: ["browser_print", "future_pdf"],
      htmlIncluded: false,
      pdfGenerated: false,
      generatedPdfAttachment: null,
      notes: "This payload is structured for print screens and future PDF rendering; it does not include rendered HTML or PDF bytes."
    },
    title: `${documentType.toUpperCase()} ${documentNumber}`,
    sections: {
      header,
      vendor: mapVendorBlock(vendor),
      customer: mapCustomerBlock(customer),
      items,
      totals,
      footer: {
        notes: notes || null
      }
    }
  };
}

async function getVendorForDocument(vendorId) {
  const vendor = await findVendorById(vendorId);

  if (!vendor) {
    throw new AppError("Vendor not found", {
      statusCode: 404,
      code: "VENDOR_NOT_FOUND"
    });
  }

  return vendor;
}

async function buildQuotationPrintDocument(vendorId, quotationId) {
  const [vendor, quotation] = await Promise.all([
    getVendorForDocument(vendorId),
    getQuotationDetail(vendorId, quotationId)
  ]);

  return buildDocumentEnvelope({
    documentType: "quotation",
    documentNumber: quotation.quoteNumber,
    vendor,
    customer: quotation.customer,
    header: {
      id: quotation.id,
      vendorId: quotation.vendorId,
      customerId: quotation.customerId,
      quoteNumber: quotation.quoteNumber,
      status: quotation.status,
      issueDate: quotation.issueDate,
      expiryDate: quotation.expiryDate,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt
    },
    items: mapItemTable(quotation.items),
    totals: buildTotalsBlock(quotation),
    notes: quotation.notes
  });
}

async function buildInvoicePrintDocument(vendorId, invoiceId) {
  const [vendor, invoice] = await Promise.all([
    getVendorForDocument(vendorId),
    getInvoiceDetail(vendorId, invoiceId)
  ]);

  return buildDocumentEnvelope({
    documentType: "invoice",
    documentNumber: invoice.invoiceNumber,
    vendor,
    customer: invoice.customer,
    header: {
      id: invoice.id,
      vendorId: invoice.vendorId,
      customerId: invoice.customerId,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      balanceDue: toAmount(invoice.balanceDue),
      order: invoice.order,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    },
    items: mapItemTable(invoice.items),
    totals: {
      ...buildTotalsBlock(invoice),
      balanceDue: toAmount(invoice.balanceDue)
    },
    notes: invoice.notes
  });
}

export { buildInvoicePrintDocument, buildQuotationPrintDocument, DOCUMENT_RENDER_VERSION };
