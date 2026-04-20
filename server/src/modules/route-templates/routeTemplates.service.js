import AppError from "../../core/errors/AppError.js";
import {
  createRouteTemplateForVendor,
  createTemplateStopForVendor,
  deleteRouteTemplateForVendor,
  deleteTemplateStopForVendor,
  findCustomerRelationshipForVendor,
  findRouteTemplateForVendor,
  findTemplateStopBySequence,
  findTemplateStopForVendor,
  generateRouteFromTemplate,
  listRouteTemplatesForVendor,
  listTemplateStopsForVendor,
  updateRouteTemplateForVendor,
  updateTemplateStopForVendor
} from "./routeTemplates.repository.js";

const TEMPLATE_FIELDS = {
  name: "name",
  notes: "notes",
  vehicleLabel: "vehicle_label",
  isActive: "is_active",
  recurrenceType: "recurrence_type",
  recurrenceDays: "recurrence_days"
};

const TEMPLATE_STOP_FIELDS = {
  customerId: "customer_id",
  sequenceNumber: "sequence_number",
  notes: "notes"
};

function toColumnPayload(input = {}, fieldMap) {
  const payload = {};

  Object.entries(fieldMap).forEach(([inputKey, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      payload[column] = input[inputKey];
    }
  });

  return payload;
}

function mapTemplate(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    notes: row.notes,
    vehicleLabel: row.vehicle_label,
    isActive: row.is_active,
    recurrenceType: row.recurrence_type,
    recurrenceDays: row.recurrence_days || [],
    stopCount: row.stop_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTemplateStop(row) {
  return {
    id: row.id,
    templateId: row.template_id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    sequenceNumber: row.sequence_number,
    notes: row.notes,
    customer: {
      id: row.customer_id,
      relationshipId: row.vendor_customer_relationship_id,
      accountCode: row.customer_account_code,
      relationshipStatus: row.customer_relationship_status,
      fullName: row.customer_full_name,
      companyName: row.customer_company_name,
      email: row.customer_email,
      phone: row.customer_phone
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapGeneratedRoute(row, stops) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    routeDate: row.route_date,
    status: row.status,
    driverUserId: row.driver_user_id,
    vehicleLabel: row.vehicle_label,
    sourceRouteTemplateId: row.source_route_template_id,
    notes: row.notes,
    metadata: row.metadata || {},
    stops: stops.map((stop) => ({
      id: stop.id,
      routeId: stop.route_id,
      vendorId: stop.vendor_id,
      customerId: stop.customer_id,
      vendorCustomerRelationshipId: stop.vendor_customer_relationship_id,
      orderId: stop.order_id,
      sequenceNumber: stop.sequence_number,
      stopType: stop.stop_type,
      status: stop.status,
      plannedArrivalAt: stop.planned_arrival_at,
      actualArrivalAt: stop.actual_arrival_at,
      notes: stop.notes,
      metadata: stop.metadata || {},
      customer: {
        id: stop.customer_id,
        relationshipId: stop.vendor_customer_relationship_id,
        accountCode: stop.customer_account_code,
        fullName: stop.customer_full_name,
        companyName: stop.customer_company_name,
        email: stop.customer_email,
        phone: stop.customer_phone
      },
      createdAt: stop.created_at,
      updatedAt: stop.updated_at
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
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

function assertTemplateFound(row, templateId) {
  if (!row) {
    throw new AppError("Route template not found for this vendor", {
      statusCode: 404,
      code: "ROUTE_TEMPLATE_NOT_FOUND",
      details: [
        {
          path: "templateId",
          message: `No route template was found for ${templateId}`
        }
      ]
    });
  }
}

function assertTemplateStopFound(row, stopId) {
  if (!row) {
    throw new AppError("Route template stop not found for this vendor", {
      statusCode: 404,
      code: "ROUTE_TEMPLATE_STOP_NOT_FOUND",
      details: [
        {
          path: "stopId",
          message: `No route template stop was found for ${stopId}`
        }
      ]
    });
  }
}

async function assertCustomerLinkedToVendor(vendorId, customerId) {
  const relationship = await findCustomerRelationshipForVendor(vendorId, customerId);

  if (!relationship) {
    throw new AppError("Customer is not linked to this vendor", {
      statusCode: 422,
      code: "CUSTOMER_NOT_AVAILABLE",
      details: [
        {
          path: "customerId",
          message: "Route template stops can only use customers linked to the current vendor"
        }
      ]
    });
  }

  return relationship;
}

async function assertSequenceAvailable(vendorId, templateId, sequenceNumber, currentStopId = null) {
  const existing = await findTemplateStopBySequence(vendorId, templateId, sequenceNumber);

  if (existing && existing.id !== currentStopId) {
    throw new AppError("Template stop sequence number already exists", {
      statusCode: 409,
      code: "ROUTE_TEMPLATE_STOP_SEQUENCE_CONFLICT",
      details: [
        {
          path: "sequenceNumber",
          message: "Sequence numbers must be unique within a route template"
        }
      ]
    });
  }
}

async function getRouteTemplateDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listRouteTemplatesForVendor({
    vendorId,
    search: query.search || null,
    isActive: query.isActive ?? null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapTemplate),
    pagination: paginationMeta(query, result.total),
    filters: {
      search: query.search || null,
      isActive: query.isActive ?? null
    }
  };
}

async function getRouteTemplateDetail(vendorId, templateId) {
  const template = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(template, templateId);

  const stops = await listTemplateStopsForVendor(vendorId, templateId);

  return {
    ...mapTemplate(template),
    stops: stops.map(mapTemplateStop)
  };
}

async function createRouteTemplate(vendorId, payload) {
  const template = await createRouteTemplateForVendor(
    vendorId,
    toColumnPayload(payload, TEMPLATE_FIELDS)
  );

  return mapTemplate(template);
}

async function updateRouteTemplate(vendorId, templateId, payload) {
  const existing = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(existing, templateId);

  const template = await updateRouteTemplateForVendor(
    vendorId,
    templateId,
    toColumnPayload(payload, TEMPLATE_FIELDS)
  );

  assertTemplateFound(template, templateId);

  return mapTemplate(template);
}

async function deleteRouteTemplate(vendorId, templateId) {
  const deleted = await deleteRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(deleted, templateId);

  return {
    id: deleted.id,
    deleted: true
  };
}

async function getTemplateStops(vendorId, templateId) {
  const template = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(template, templateId);

  const stops = await listTemplateStopsForVendor(vendorId, templateId);

  return {
    template: mapTemplate(template),
    items: stops.map(mapTemplateStop)
  };
}

async function createTemplateStop(vendorId, templateId, payload) {
  const template = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(template, templateId);
  await assertCustomerLinkedToVendor(vendorId, payload.customerId);
  await assertSequenceAvailable(vendorId, templateId, payload.sequenceNumber);

  const stop = await createTemplateStopForVendor(
    vendorId,
    templateId,
    toColumnPayload(payload, TEMPLATE_STOP_FIELDS)
  );

  assertTemplateStopFound(stop, "created stop");

  return mapTemplateStop(stop);
}

async function updateTemplateStop(vendorId, templateId, stopId, payload) {
  const template = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(template, templateId);

  const existing = await findTemplateStopForVendor(vendorId, templateId, stopId);

  assertTemplateStopFound(existing, stopId);

  if (payload.customerId) {
    await assertCustomerLinkedToVendor(vendorId, payload.customerId);
  }

  if (
    payload.sequenceNumber !== undefined &&
    payload.sequenceNumber !== existing.sequence_number
  ) {
    await assertSequenceAvailable(vendorId, templateId, payload.sequenceNumber, stopId);
  }

  const stop = await updateTemplateStopForVendor(
    vendorId,
    templateId,
    stopId,
    toColumnPayload(payload, TEMPLATE_STOP_FIELDS)
  );

  assertTemplateStopFound(stop, stopId);

  return mapTemplateStop(stop);
}

async function deleteTemplateStop(vendorId, templateId, stopId) {
  const template = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(template, templateId);

  const deleted = await deleteTemplateStopForVendor(vendorId, templateId, stopId);

  assertTemplateStopFound(deleted, stopId);

  return {
    id: deleted.id,
    deleted: true
  };
}

async function generateRoute(vendorId, templateId, payload) {
  const template = await findRouteTemplateForVendor(vendorId, templateId);

  assertTemplateFound(template, templateId);

  if (!template.is_active) {
    throw new AppError("Inactive route templates cannot generate routes", {
      statusCode: 409,
      code: "ROUTE_TEMPLATE_INACTIVE"
    });
  }

  const stops = await listTemplateStopsForVendor(vendorId, templateId);

  if (stops.length === 0) {
    throw new AppError("Route template has no stops", {
      statusCode: 422,
      code: "ROUTE_TEMPLATE_STOPS_REQUIRED"
    });
  }

  const invalidStops = stops.filter((stop) => !stop.vendor_customer_relationship_id);

  if (invalidStops.length > 0) {
    throw new AppError("One or more template stops are no longer linked to this vendor", {
      statusCode: 422,
      code: "ROUTE_TEMPLATE_STOP_CUSTOMER_NOT_AVAILABLE"
    });
  }

  const generated = await generateRouteFromTemplate({
    vendorId,
    template,
    stops,
    route: {
      name: payload.name || `${template.name} - ${payload.routeDate}`,
      route_date: payload.routeDate,
      status: payload.status || "planned",
      vehicle_label: payload.vehicleLabel ?? template.vehicle_label,
      notes: payload.notes ?? template.notes,
      metadata: {
        source: "route_template",
        sourceRouteTemplateId: template.id,
        sourceRouteTemplateName: template.name
      }
    }
  });

  return mapGeneratedRoute(generated.route, generated.stops);
}

export {
  createRouteTemplate,
  createTemplateStop,
  deleteRouteTemplate,
  deleteTemplateStop,
  generateRoute,
  getRouteTemplateDetail,
  getRouteTemplateDirectory,
  getTemplateStops,
  updateRouteTemplate,
  updateTemplateStop
};
