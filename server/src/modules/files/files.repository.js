import { query } from "../../config/db.js";

const ATTACHMENT_SELECT = `id,
                           vendor_id,
                           uploaded_by_user_id,
                           entity_type,
                           entity_id,
                           original_filename,
                           stored_filename,
                           storage_key,
                           storage_backend,
                           mime_type,
                           file_size,
                           metadata,
                           created_at`;

async function createAttachment(payload) {
  const result = await query(
    `INSERT INTO attachments (
       vendor_id,
       uploaded_by_user_id,
       entity_type,
       entity_id,
       original_filename,
       stored_filename,
       storage_key,
       storage_backend,
       mime_type,
       file_size,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${ATTACHMENT_SELECT}`,
    [
      payload.vendor_id,
      payload.uploaded_by_user_id,
      payload.entity_type,
      payload.entity_id,
      payload.original_filename,
      payload.stored_filename,
      payload.storage_key,
      payload.storage_backend,
      payload.mime_type,
      payload.file_size,
      payload.metadata || {}
    ]
  );

  return result.rows[0] || null;
}

async function findAttachmentForVendor(vendorId, attachmentId) {
  const result = await query(
    `SELECT ${ATTACHMENT_SELECT}
     FROM attachments
     WHERE vendor_id = $1
       AND id = $2
     LIMIT 1`,
    [vendorId, attachmentId]
  );

  return result.rows[0] || null;
}

async function listAttachmentsForVendor({
  vendorId,
  entityType = null,
  entityId = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["vendor_id = $1"];
  const values = [vendorId];

  if (entityType) {
    values.push(entityType);
    conditions.push(`entity_type = $${values.length}`);
  }

  if (entityId) {
    values.push(entityId);
    conditions.push(`entity_id = $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM attachments
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${ATTACHMENT_SELECT}
     FROM attachments
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function deleteAttachmentForVendor(vendorId, attachmentId) {
  const result = await query(
    `DELETE FROM attachments
     WHERE vendor_id = $1
       AND id = $2
     RETURNING ${ATTACHMENT_SELECT}`,
    [vendorId, attachmentId]
  );

  return result.rows[0] || null;
}

async function findTargetForVendor(vendorId, entityType, entityId) {
  const lookups = {
    customers: {
      sql: `SELECT relationship.customer_id AS id
            FROM vendor_customer_relationships relationship
            WHERE relationship.vendor_id = $1
              AND relationship.customer_id = $2
            LIMIT 1`
    },
    quotations: {
      sql: `SELECT id
            FROM quotations
            WHERE vendor_id = $1
              AND id = $2
            LIMIT 1`
    },
    orders: {
      sql: `SELECT id
            FROM orders
            WHERE vendor_id = $1
              AND id = $2
            LIMIT 1`
    },
    invoices: {
      sql: `SELECT id
            FROM invoices
            WHERE vendor_id = $1
              AND id = $2
            LIMIT 1`
    },
    routes: {
      sql: `SELECT id
            FROM routes
            WHERE vendor_id = $1
              AND id = $2
            LIMIT 1`
    }
  };

  const lookup = lookups[entityType];

  if (!lookup) {
    return null;
  }

  const result = await query(lookup.sql, [vendorId, entityId]);
  return result.rows[0] || null;
}

export {
  createAttachment,
  deleteAttachmentForVendor,
  findAttachmentForVendor,
  findTargetForVendor,
  listAttachmentsForVendor
};
