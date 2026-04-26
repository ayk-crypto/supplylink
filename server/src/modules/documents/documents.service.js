import AppError from "../../core/errors/AppError.js";
import { findVendorById } from "../vendors/vendors.repository.js";
import { getQuotationDetail } from "../quotations/quotations.service.js";
import { getInvoiceDetail } from "../invoices/invoices.service.js";
import { getTenantLogo, getTenantSettings } from "../settings/settings.service.js";
import { renderStructuredDocumentPdf } from "./documents.pdf.js";

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

function mapBrandingBlock(settings = {}) {
  const company = settings.company || {};
  const currency = settings.currency || {};
  const preferences = settings.preferences || {};
  const invoice = settings.invoice || {};

  return {
    company: {
      displayName: company.displayName || "",
      legalName: company.legalName || "",
      email: company.email || "",
      phone: company.phone || "",
      taxId: company.taxId || "",
      addressLine1: company.addressLine1 || "",
      addressLine2: company.addressLine2 || "",
      logoUrl: company.logoUrl || company.logo?.downloadUrl || "",
      logo: company.logo || null,
      primaryBrandColor: company.primaryBrandColor || "",
      invoiceFooter: company.invoiceFooter || ""
    },
    formatting: {
      currencyCode: currency.code || "USD",
      decimals: Number(currency.decimals || 2),
      thousandsSeparator: currency.thousandsSeparator || ",",
      dateFormat: preferences.dateFormat || "YYYY-MM-DD"
    },
    defaults: {
      invoicePrefix: invoice.prefix || "",
      invoiceSuffix: invoice.suffix || "",
      invoiceDefaultDueDays: Number(invoice.defaultDueDays || 0),
      termsAndNotes: invoice.defaultNotes || ""
    }
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

function buildDocumentEnvelope({
  documentType,
  documentNumber,
  vendor,
  branding,
  customer,
  header,
  items,
  totals,
  notes,
  terms
}) {
  return {
    documentType,
    renderVersion: DOCUMENT_RENDER_VERSION,
    output: {
      format: "structured-json",
      renderTargets: ["browser_print", "download_pdf"],
      htmlIncluded: false,
      pdfGenerated: false,
      generatedPdfAttachment: null,
      notes: "This payload is structured for browser preview/print and backend PDF rendering; it does not include rendered HTML or PDF bytes."
    },
    title: `${documentType.toUpperCase()} ${documentNumber}`,
    sections: {
      header,
      vendor: mapVendorBlock(vendor),
      branding,
      customer: mapCustomerBlock(customer),
      items,
      totals,
      footer: {
        notes: notes || null,
        terms: terms || null,
        invoiceFooter: branding?.company?.invoiceFooter || ""
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

async function getVendorLogoPath(vendorId) {
  try {
    const result = await getTenantLogo(vendorId);
    return result.path || null;
  } catch (error) {
    if (
      error?.code === "WORKSPACE_LOGO_NOT_FOUND" ||
      error?.code === "WORKSPACE_LOGO_INVALID"
    ) {
      return null;
    }

    throw error;
  }
}

async function buildQuotationPrintDocument(vendorId, quotationId) {
  const [vendor, tenantSettings, quotation] = await Promise.all([
    getVendorForDocument(vendorId),
    getTenantSettings(vendorId),
    getQuotationDetail(vendorId, quotationId)
  ]);

  const branding = mapBrandingBlock(tenantSettings.settings);

  return buildDocumentEnvelope({
    documentType: "quotation",
    documentNumber: quotation.quoteNumber,
    vendor,
    branding,
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
    notes: quotation.notes,
    terms: branding.defaults.termsAndNotes
  });
}

async function buildInvoicePrintDocument(vendorId, invoiceId) {
  const [vendor, tenantSettings, invoice] = await Promise.all([
    getVendorForDocument(vendorId),
    getTenantSettings(vendorId),
    getInvoiceDetail(vendorId, invoiceId)
  ]);

  const branding = mapBrandingBlock(tenantSettings.settings);

  return buildDocumentEnvelope({
    documentType: "invoice",
    documentNumber: invoice.invoiceNumber,
    vendor,
    branding,
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
    notes: invoice.notes,
    terms: branding.defaults.termsAndNotes
  });
}

function buildPdfFilename(document) {
  const header = document.sections?.header || {};
  const number = header.invoiceNumber || header.quoteNumber || document.title || "document";

  return `${String(number)
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "document"}.pdf`;
}

async function buildQuotationPdfDocument(vendorId, quotationId) {
  const [document, logoPath] = await Promise.all([
    buildQuotationPrintDocument(vendorId, quotationId),
    getVendorLogoPath(vendorId)
  ]);
  const buffer = await renderStructuredDocumentPdf(document, { logoPath });

  return {
    buffer,
    contentType: "application/pdf",
    filename: buildPdfFilename(document),
    document
  };
}

async function buildInvoicePdfDocument(vendorId, invoiceId) {
  const [document, logoPath] = await Promise.all([
    buildInvoicePrintDocument(vendorId, invoiceId),
    getVendorLogoPath(vendorId)
  ]);
  const buffer = await renderStructuredDocumentPdf(document, { logoPath });

  return {
    buffer,
    contentType: "application/pdf",
    filename: buildPdfFilename(document),
    document
  };
}

export {
  buildInvoicePdfDocument,
  buildInvoicePrintDocument,
  buildQuotationPdfDocument,
  buildQuotationPrintDocument,
  DOCUMENT_RENDER_VERSION
};
