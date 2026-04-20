import { query } from "../../config/db.js";

async function createAuditEvent({
  vendorId,
  actorUserId = null,
  entityType,
  entityId,
  eventType,
  eventLabel,
  metadata = {},
  requestId = null
}) {
  const result = await query(
    `INSERT INTO audit_logs (
       vendor_id,
       actor_user_id,
       action,
       entity_type,
       entity_id,
       event_type,
       event_label,
       request_id,
       payload,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     RETURNING id,
               vendor_id,
               actor_user_id,
               entity_type,
               entity_id,
               event_type,
               event_label,
               metadata,
               created_at`,
    [
      vendorId,
      actorUserId,
      eventType,
      entityType,
      entityId,
      eventType,
      eventLabel,
      requestId,
      metadata
    ]
  );

  return result.rows[0];
}

async function listAuditEventsForVendor({
  vendorId,
  entityType = null,
  entityId = null,
  eventType = null,
  dateFrom = null,
  dateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["audit.vendor_id = $1"];
  const values = [vendorId];

  if (entityType) {
    values.push(entityType);
    conditions.push(`audit.entity_type = $${values.length}`);
  }

  if (entityId) {
    values.push(entityId);
    conditions.push(`audit.entity_id = $${values.length}`);
  }

  if (eventType) {
    values.push(eventType);
    conditions.push(`audit.event_type = $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`audit.created_at::date >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(`audit.created_at::date <= $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM audit_logs audit
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT id,
            audit.vendor_id,
            audit.actor_user_id,
            audit.entity_type,
            audit.entity_id,
            audit.event_type,
            audit.event_label,
            audit.metadata,
            audit.created_at,
            actor.full_name AS actor_full_name,
            actor.email AS actor_email,
            CASE audit.entity_type
              WHEN 'quotation' THEN quotation.quote_number
              WHEN 'order' THEN order_entity.order_number
              WHEN 'invoice' THEN invoice.invoice_number
              WHEN 'payment' THEN payment.payment_reference
              WHEN 'product' THEN product.sku
              ELSE NULL
            END AS entity_reference,
            CASE audit.entity_type
              WHEN 'quotation' THEN quotation.quote_number
              WHEN 'order' THEN order_entity.order_number
              WHEN 'invoice' THEN invoice.invoice_number
              WHEN 'payment' THEN COALESCE(payment.payment_reference, payment.id::text)
              WHEN 'product' THEN COALESCE(product.name, product.sku)
              ELSE NULL
            END AS entity_label
     FROM audit_logs audit
     LEFT JOIN users actor ON actor.id = audit.actor_user_id
     LEFT JOIN quotations quotation
       ON audit.entity_type = 'quotation'
      AND quotation.id = audit.entity_id
      AND quotation.vendor_id = audit.vendor_id
     LEFT JOIN orders order_entity
       ON audit.entity_type = 'order'
      AND order_entity.id = audit.entity_id
      AND order_entity.vendor_id = audit.vendor_id
     LEFT JOIN invoices invoice
       ON audit.entity_type = 'invoice'
      AND invoice.id = audit.entity_id
      AND invoice.vendor_id = audit.vendor_id
     LEFT JOIN payments payment
       ON audit.entity_type = 'payment'
      AND payment.id = audit.entity_id
      AND payment.vendor_id = audit.vendor_id
     LEFT JOIN products product
       ON audit.entity_type = 'product'
      AND product.id = audit.entity_id
      AND product.vendor_id = audit.vendor_id
     ${whereClause}
     ORDER BY audit.created_at DESC, audit.id DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

export { createAuditEvent, listAuditEventsForVendor };
