import { createAuditEvent, listAuditEventsForVendor } from "./audit.repository.js";

function mapAuditEvent(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    actorUserId: row.actor_user_id,
    actorDisplay: row.actor_full_name || row.actor_email || null,
    actor: row.actor_user_id
      ? {
          id: row.actor_user_id,
          display: row.actor_full_name || row.actor_email || null,
          fullName: row.actor_full_name,
          email: row.actor_email
        }
      : null,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityReference: row.entity_reference,
    entityLabel: row.entity_label || row.entity_reference,
    entity: row.entity_id
      ? {
          type: row.entity_type,
          id: row.entity_id,
          reference: row.entity_reference,
          label: row.entity_label || row.entity_reference
        }
      : null,
    eventType: row.event_type,
    eventLabel: row.event_label,
    metadata: row.metadata || {},
    createdAt: row.created_at
  };
}

function paginationMeta(query, total) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  return {
    page,
    pageSize,
    totalItems: total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
  };
}

async function recordAuditEvent({
  vendorId,
  actor = {},
  entityType,
  entityId,
  eventType,
  eventLabel,
  metadata = {},
  requestId = null
}) {
  return createAuditEvent({
    vendorId,
    actorUserId: actor.userId || null,
    entityType,
    entityId,
    eventType,
    eventLabel,
    metadata,
    requestId
  });
}

async function getAuditDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listAuditEventsForVendor({
    vendorId,
    entityType: query.entityType || null,
    entityId: query.entityId || null,
    eventType: query.eventType || null,
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapAuditEvent),
    pagination: paginationMeta(query, result.total),
    filters: {
      entityType: query.entityType || null,
      entityId: query.entityId || null,
      eventType: query.eventType || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null
    }
  };
}

async function getEntityAuditHistory(vendorId, entityType, entityId, query) {
  return getAuditDirectory(vendorId, {
    ...query,
    entityType,
    entityId
  });
}

export { getAuditDirectory, getEntityAuditHistory, recordAuditEvent };
