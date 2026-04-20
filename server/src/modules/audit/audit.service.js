import { createAuditEvent, listAuditEventsForVendor } from "./audit.repository.js";

function mapAuditEvent(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    actorUserId: row.actor_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
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
