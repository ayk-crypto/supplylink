import { randomBytes } from "crypto";
import env from "../../config/env.js";
import AppError from "../../core/errors/AppError.js";
import { recordAuditEvent } from "../audit/audit.service.js";
import { getInvoiceDetail } from "../invoices/invoices.service.js";
import { getQuotationDetail } from "../quotations/quotations.service.js";
import {
  buildInvoicePdfDocument,
  buildInvoicePrintDocument,
  buildQuotationPdfDocument,
  buildQuotationPrintDocument
} from "./documents.service.js";
import {
  createDocumentShare,
  findActiveDocumentShareByToken,
  findActiveInvoiceShareForVendor,
  findActiveQuotationShareForVendor,
  markDocumentShareViewed,
  touchDocumentShareSent
} from "./documents.repository.js";

function generatePublicToken() {
  return randomBytes(24).toString("base64url");
}

function buildShareUrl(publicToken) {
  return `${env.CLIENT_URL.replace(/\/+$/, "")}/share/${publicToken}`;
}

function mapShareSummary(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    documentType: row.document_type,
    publicToken: row.public_token,
    publicUrl: buildShareUrl(row.public_token),
    sentAt: row.sent_at,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: Number(row.view_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function isMissingDocumentSharesTableError(error) {
  return error?.code === "42P01";
}

function assertShareFound(row) {
  if (!row) {
    throw new AppError("Shared document not found", {
      statusCode: 404,
      code: "DOCUMENT_SHARE_NOT_FOUND",
      details: [
        {
          path: "token",
          message: "This shared document link is invalid or no longer available"
        }
      ]
    });
  }
}

async function getDocumentShareSummary(vendorId, documentType, documentId) {
  try {
    const share =
      documentType === "quotation"
        ? await findActiveQuotationShareForVendor(vendorId, documentId)
        : await findActiveInvoiceShareForVendor(vendorId, documentId);

    return mapShareSummary(share);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      return null;
    }

    throw error;
  }
}

function documentSharingUnavailableError() {
  return new AppError("Document sharing is temporarily unavailable until the latest migration is applied", {
    statusCode: 503,
    code: "DOCUMENT_SHARING_MIGRATION_REQUIRED",
    details: [
      {
        path: "document_shares",
        message: "Apply migration 019_document_shares.sql to enable send/share links"
      }
    ]
  });
}

async function ensureDocumentShare(vendorId, documentType, documentId, actor = {}) {
  try {
    const detail =
      documentType === "quotation"
        ? await getQuotationDetail(vendorId, documentId)
        : await getInvoiceDetail(vendorId, documentId);
    const existing =
      documentType === "quotation"
        ? await findActiveQuotationShareForVendor(vendorId, documentId)
        : await findActiveInvoiceShareForVendor(vendorId, documentId);
    const share = existing
      ? await touchDocumentShareSent(existing.id)
      : await createDocumentShare({
          vendorId,
          documentType,
          quotationId: documentType === "quotation" ? documentId : null,
          invoiceId: documentType === "invoice" ? documentId : null,
          publicToken: generatePublicToken(),
          createdBy: actor.userId || null
        });

    await recordAuditEvent({
      vendorId,
      actor,
      entityType: documentType,
      entityId: documentId,
      eventType: `${documentType}.shared`,
      eventLabel: `${documentType === "quotation" ? "Quotation" : "Invoice"} ${documentType === "quotation" ? detail.quoteNumber : detail.invoiceNumber} share link was generated.`,
      metadata: {
        documentType,
        documentId,
        publicUrl: buildShareUrl(share.public_token),
        sentAt: share.sent_at
      }
    });

    return mapShareSummary(share);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }
}

async function getPublicSharedDocument(token) {
  let share;

  try {
    share = await findActiveDocumentShareByToken(token);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }

  assertShareFound(share);

  const viewedShare = await markDocumentShareViewed(share.id);
  const document =
    share.document_type === "quotation"
      ? await buildQuotationPrintDocument(share.vendor_id, share.quotation_id)
      : await buildInvoicePrintDocument(share.vendor_id, share.invoice_id);

  return {
    document,
    share: mapShareSummary(viewedShare)
  };
}

async function getPublicSharedDocumentPdf(token) {
  let share;

  try {
    share = await findActiveDocumentShareByToken(token);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }

  assertShareFound(share);

  return share.document_type === "quotation"
    ? buildQuotationPdfDocument(share.vendor_id, share.quotation_id)
    : buildInvoicePdfDocument(share.vendor_id, share.invoice_id);
}

export {
  ensureDocumentShare,
  getDocumentShareSummary,
  getPublicSharedDocument,
  getPublicSharedDocumentPdf
};
