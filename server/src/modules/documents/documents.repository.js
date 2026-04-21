import { query } from "../../config/db.js";

const SHARE_SELECT = `share.id,
                      share.vendor_id,
                      share.document_type,
                      share.quotation_id,
                      share.invoice_id,
                      share.public_token,
                      share.created_by,
                      share.sent_at,
                      share.first_viewed_at,
                      share.last_viewed_at,
                      share.view_count,
                      share.expires_at,
                      share.revoked_at,
                      share.revoked_by,
                      share.created_at,
                      share.updated_at`;

const SHARE_RETURNING = `id,
                         vendor_id,
                         document_type,
                         quotation_id,
                         invoice_id,
                         public_token,
                         created_by,
                         sent_at,
                         first_viewed_at,
                         last_viewed_at,
                         view_count,
                         expires_at,
                         revoked_at,
                         revoked_by,
                         created_at,
                         updated_at`;

function buildDocumentPredicate(documentType, paramIndex) {
  return documentType === "quotation"
    ? `share.quotation_id = $${paramIndex}`
    : `share.invoice_id = $${paramIndex}`;
}

async function findActiveDocumentShareForVendor(vendorId, documentType, documentId) {
  const result = await query(
    `SELECT ${SHARE_SELECT}
     FROM document_shares share
     WHERE share.vendor_id = $1
       AND ${buildDocumentPredicate(documentType, 2)}
       AND share.revoked_at IS NULL
       AND (share.expires_at IS NULL OR share.expires_at > NOW())
     ORDER BY share.created_at DESC
     LIMIT 1`,
    [vendorId, documentId]
  );

  return result.rows[0] || null;
}

async function findLatestDocumentShareForVendor(vendorId, documentType, documentId) {
  const result = await query(
    `SELECT ${SHARE_SELECT}
     FROM document_shares share
     WHERE share.vendor_id = $1
       AND ${buildDocumentPredicate(documentType, 2)}
     ORDER BY share.created_at DESC
     LIMIT 1`,
    [vendorId, documentId]
  );

  return result.rows[0] || null;
}

async function createDocumentShare({
  createdBy,
  documentType,
  expiresAt = null,
  invoiceId = null,
  publicToken,
  quotationId = null,
  vendorId
}) {
  const result = await query(
    `INSERT INTO document_shares (
       vendor_id,
       document_type,
       quotation_id,
       invoice_id,
       public_token,
       created_by,
       expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SHARE_RETURNING}`,
    [vendorId, documentType, quotationId, invoiceId, publicToken, createdBy || null, expiresAt]
  );

  return result.rows[0] || null;
}

async function touchDocumentShareSent(shareId) {
  const result = await query(
    `UPDATE document_shares share
     SET sent_at = NOW(),
         updated_at = NOW()
     WHERE share.id = $1
     RETURNING ${SHARE_SELECT}`,
    [shareId]
  );

  return result.rows[0] || null;
}

async function findDocumentShareByToken(publicToken) {
  const result = await query(
    `SELECT ${SHARE_SELECT}
     FROM document_shares share
     WHERE share.public_token = $1
     LIMIT 1`,
    [publicToken]
  );

  return result.rows[0] || null;
}

async function markDocumentShareViewed(shareId) {
  const result = await query(
    `UPDATE document_shares share
     SET first_viewed_at = COALESCE(share.first_viewed_at, NOW()),
         last_viewed_at = NOW(),
         view_count = share.view_count + 1,
         updated_at = NOW()
     WHERE share.id = $1
     RETURNING ${SHARE_SELECT}`,
    [shareId]
  );

  return result.rows[0] || null;
}

async function revokeDocumentShare(shareId, revokedBy = null) {
  const result = await query(
    `UPDATE document_shares share
     SET revoked_at = NOW(),
         revoked_by = $2,
         updated_at = NOW()
     WHERE share.id = $1
     RETURNING ${SHARE_SELECT}`,
    [shareId, revokedBy]
  );

  return result.rows[0] || null;
}

export {
  createDocumentShare,
  findActiveDocumentShareForVendor,
  findDocumentShareByToken,
  findLatestDocumentShareForVendor,
  markDocumentShareViewed,
  revokeDocumentShare,
  touchDocumentShareSent
};
