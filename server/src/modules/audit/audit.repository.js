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

  if (eventType) {
    values.push(eventType);
    conditions.push(`event_type = $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`created_at::date >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(`created_at::date <= $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM audit_logs
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT id,
            vendor_id,
            actor_user_id,
            entity_type,
            entity_id,
            event_type,
            event_label,
            metadata,
            created_at
     FROM audit_logs
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

export { createAuditEvent, listAuditEventsForVendor };
