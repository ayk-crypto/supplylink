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
  findActiveDocumentShareForVendor,
  findDocumentShareByToken,
  findLatestDocumentShareForVendor,
  markDocumentShareViewed,
  revokeDocumentShare,
  touchDocumentShareSent
} from "./documents.repository.js";

const DEFAULT_SHARE_TTL_DAYS = 30;

function generatePublicToken() {
  return randomBytes(24).toString("base64url");
}

function buildShareUrl(publicToken) {
  return `${env.CLIENT_URL.replace(/\/+$/, "")}/share/${publicToken}`;
}

function isMissingDocumentSharesTableError(error) {
  return (
    error?.code === "42P01" &&
    typeof error?.message === "string" &&
    /document_shares/i.test(error.message)
  );
}

function getShareStatus(row) {
  if (!row) {
    return "missing";
  }

  if (row.revoked_at) {
    return "revoked";
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return "expired";
  }

  return "active";
}

function mapShareSummary(row) {
  if (!row) {
    return null;
  }

  const status = getShareStatus(row);

  return {
    id: row.id,
    documentType: row.document_type,
    publicToken: row.public_token,
    publicUrl: buildShareUrl(row.public_token),
    status,
    isActive: status === "active",
    sentAt: row.sent_at,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: Number(row.view_count || 0),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function documentLabel(documentType) {
  return documentType === "quotation" ? "Quotation" : "Invoice";
}

function getDocumentNumber(detail, documentType) {
  return documentType === "quotation" ? detail.quoteNumber : detail.invoiceNumber;
}

function getDefaultExpiryDate() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + DEFAULT_SHARE_TTL_DAYS);
  return expiry.toISOString();
}

async function getDocumentDetail(vendorId, documentType, documentId) {
  return documentType === "quotation"
    ? getQuotationDetail(vendorId, documentId)
    : getInvoiceDetail(vendorId, documentId);
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

function assertPublicShareAccessible(share) {
  assertShareFound(share);

  if (share.revoked_at) {
    throw new AppError("This shared document link has been revoked", {
      statusCode: 410,
      code: "DOCUMENT_SHARE_REVOKED",
      details: [
        {
          path: "token",
          message: "Ask the sender for a new secure link"
        }
      ]
    });
  }

  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    throw new AppError("This shared document link has expired", {
      statusCode: 410,
      code: "DOCUMENT_SHARE_EXPIRED",
      details: [
        {
          path: "token",
          message: "Ask the sender for a refreshed secure link"
        }
      ]
    });
  }
}

function documentSharingUnavailableError() {
  return new AppError(
    "Document sharing is temporarily unavailable until the latest migration is applied",
    {
      statusCode: 503,
      code: "DOCUMENT_SHARING_MIGRATION_REQUIRED",
      details: [
        {
          path: "document_shares",
          message: "Apply the latest document sharing migration to enable send/share links"
        }
      ]
    }
  );
}

async function getDocumentShareSummary(vendorId, documentType, documentId) {
  try {
    const share = await findLatestDocumentShareForVendor(vendorId, documentType, documentId);
    return mapShareSummary(share);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      return null;
    }

    throw error;
  }
}

async function createNewShare(vendorId, documentType, documentId, actor = {}) {
  const share = await createDocumentShare({
    vendorId,
    documentType,
    quotationId: documentType === "quotation" ? documentId : null,
    invoiceId: documentType === "invoice" ? documentId : null,
    publicToken: generatePublicToken(),
    createdBy: actor.userId || null,
    expiresAt: getDefaultExpiryDate()
  });

  return share;
}

async function ensureDocumentShare(vendorId, documentType, documentId, actor = {}) {
  try {
    const detail = await getDocumentDetail(vendorId, documentType, documentId);
    const existing = await findActiveDocumentShareForVendor(vendorId, documentType, documentId);
    const share = existing ? await touchDocumentShareSent(existing.id) : await createNewShare(vendorId, documentType, documentId, actor);

    if (!existing) {
      await recordAuditEvent({
        vendorId,
        actor,
        entityType: documentType,
        entityId: documentId,
        eventType: `${documentType}.share_created`,
        eventLabel: `${documentLabel(documentType)} ${getDocumentNumber(detail, documentType)} share link was created.`,
        metadata: {
          documentType,
          documentId,
          publicUrl: buildShareUrl(share.public_token),
          expiresAt: share.expires_at
        }
      });
    }

    return mapShareSummary(share);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }
}

async function revokeActiveDocumentShare(vendorId, documentType, documentId, actor = {}) {
  try {
    const detail = await getDocumentDetail(vendorId, documentType, documentId);
    const existing = await findActiveDocumentShareForVendor(vendorId, documentType, documentId);

    if (!existing) {
      throw new AppError("No active document share exists to revoke", {
        statusCode: 404,
        code: "DOCUMENT_SHARE_ACTIVE_NOT_FOUND"
      });
    }

    const revoked = await revokeDocumentShare(existing.id, actor.userId || null);

    await recordAuditEvent({
      vendorId,
      actor,
      entityType: documentType,
      entityId: documentId,
      eventType: `${documentType}.share_revoked`,
      eventLabel: `${documentLabel(documentType)} ${getDocumentNumber(detail, documentType)} share link was revoked.`,
      metadata: {
        shareId: revoked.id,
        revokedAt: revoked.revoked_at
      }
    });

    return mapShareSummary(revoked);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }
}

async function regenerateDocumentShare(vendorId, documentType, documentId, actor = {}) {
  try {
    const detail = await getDocumentDetail(vendorId, documentType, documentId);
    const existing = await findActiveDocumentShareForVendor(vendorId, documentType, documentId);

    if (existing) {
      await revokeDocumentShare(existing.id, actor.userId || null);
    }

    const share = await createNewShare(vendorId, documentType, documentId, actor);

    await recordAuditEvent({
      vendorId,
      actor,
      entityType: documentType,
      entityId: documentId,
      eventType: `${documentType}.share_regenerated`,
      eventLabel: `${documentLabel(documentType)} ${getDocumentNumber(detail, documentType)} share link was regenerated.`,
      metadata: {
        previousShareId: existing?.id || null,
        shareId: share.id,
        publicUrl: buildShareUrl(share.public_token),
        expiresAt: share.expires_at
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
    share = await findDocumentShareByToken(token);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }

  assertPublicShareAccessible(share);

  const wasFirstView = !share.first_viewed_at;
  const viewedShare = await markDocumentShareViewed(share.id);
  const document =
    share.document_type === "quotation"
      ? await buildQuotationPrintDocument(share.vendor_id, share.quotation_id)
      : await buildInvoicePrintDocument(share.vendor_id, share.invoice_id);

  if (wasFirstView) {
    await recordAuditEvent({
      vendorId: share.vendor_id,
      actor: {},
      entityType: share.document_type,
      entityId: share.document_type === "quotation" ? share.quotation_id : share.invoice_id,
      eventType: `${share.document_type}.share_viewed`,
      eventLabel: `${documentLabel(share.document_type)} ${getDocumentNumber(
        document.sections.header,
        share.document_type
      )} share link was viewed.`,
      metadata: {
        shareId: share.id,
        firstViewedAt: viewedShare.first_viewed_at
      }
    });
  }

  return {
    document,
    share: mapShareSummary(viewedShare)
  };
}

async function getPublicSharedDocumentPdf(token) {
  let share;

  try {
    share = await findDocumentShareByToken(token);
  } catch (error) {
    if (isMissingDocumentSharesTableError(error)) {
      throw documentSharingUnavailableError();
    }

    throw error;
  }

  assertPublicShareAccessible(share);

  return share.document_type === "quotation"
    ? buildQuotationPdfDocument(share.vendor_id, share.quotation_id)
    : buildInvoicePdfDocument(share.vendor_id, share.invoice_id);
}

export {
  ensureDocumentShare,
  getDocumentShareSummary,
  getPublicSharedDocument,
  getPublicSharedDocumentPdf,
  getShareStatus,
  mapShareSummary,
  regenerateDocumentShare,
  revokeActiveDocumentShare
};
