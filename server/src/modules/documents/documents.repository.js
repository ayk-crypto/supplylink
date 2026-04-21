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
                      share.revoked_at,
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
                         revoked_at,
                         created_at,
                         updated_at`;

async function findActiveQuotationShareForVendor(vendorId, quotationId) {
  const result = await query(
    `SELECT ${SHARE_SELECT}
     FROM document_shares share
     WHERE share.vendor_id = $1
       AND share.quotation_id = $2
       AND share.revoked_at IS NULL
     LIMIT 1`,
    [vendorId, quotationId]
  );

  return result.rows[0] || null;
}

async function findActiveInvoiceShareForVendor(vendorId, invoiceId) {
  const result = await query(
    `SELECT ${SHARE_SELECT}
     FROM document_shares share
     WHERE share.vendor_id = $1
       AND share.invoice_id = $2
       AND share.revoked_at IS NULL
     LIMIT 1`,
    [vendorId, invoiceId]
  );

  return result.rows[0] || null;
}

async function createDocumentShare({
  createdBy,
  documentType,
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
       created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SHARE_RETURNING}`,
    [vendorId, documentType, quotationId, invoiceId, publicToken, createdBy || null]
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

async function findActiveDocumentShareByToken(publicToken) {
  const result = await query(
    `SELECT ${SHARE_SELECT}
     FROM document_shares share
     WHERE share.public_token = $1
       AND share.revoked_at IS NULL
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

export {
  createDocumentShare,
  findActiveDocumentShareByToken,
  findActiveInvoiceShareForVendor,
  findActiveQuotationShareForVendor,
  markDocumentShareViewed,
  touchDocumentShareSent
};
