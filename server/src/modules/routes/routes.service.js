import AppError from "../../core/errors/AppError.js";
import {
  createRouteForVendor,
  createRouteStopForVendor,
  findCustomerRelationshipForVendor,
  findOrderForVendor,
  findRouteForVendor,
  findRouteStopForVendor,
  listRouteStopsForVendor,
  listRoutesForVendor,
  updateRouteForVendor,
  updateRouteStopForVendor
} from "./routes.repository.js";

const ROUTE_FIELDS = {
  name: "name",
  routeDate: "route_date",
  status: "status",
  driverUserId: "driver_user_id",
  vehicleLabel: "vehicle_label",
  notes: "notes",
  metadata: "metadata"
};

const STOP_FIELDS = {
  sequenceNumber: "sequence_number",
  customerId: "customer_id",
  orderId: "order_id",
  stopType: "stop_type",
  status: "status",
  plannedArrivalAt: "planned_arrival_at",
  actualArrivalAt: "actual_arrival_at",
  notes: "notes",
  metadata: "metadata"
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

function mapRoute(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    routeDate: row.route_date,
    status: row.status,
    driverUserId: row.driver_user_id,
    driver: row.driver_user_id
      ? {
          id: row.driver_user_id,
          fullName: row.driver_full_name,
          email: row.driver_email
        }
      : null,
    vehicleLabel: row.vehicle_label,
    notes: row.notes,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRouteStop(row) {
  return {
    id: row.id,
    routeId: row.route_id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    vendorCustomerRelationshipId: row.vendor_customer_relationship_id,
    orderId: row.order_id,
    sequenceNumber: row.sequence_number,
    stopType: row.stop_type,
    status: row.status,
    plannedArrivalAt: row.planned_arrival_at,
    actualArrivalAt: row.actual_arrival_at,
    notes: row.notes,
    metadata: row.metadata || {},
    customer: row.customer_id
      ? {
          id: row.customer_id,
          relationshipId: row.vendor_customer_relationship_id,
          accountCode: row.customer_account_code,
          relationshipStatus: row.customer_relationship_status,
          fullName: row.customer_full_name,
          companyName: row.customer_company_name,
          email: row.customer_email,
          phone: row.customer_phone
        }
      : null,
    order: row.order_id
      ? {
          id: row.order_id,
          orderNumber: row.order_number,
          status: row.order_status,
          deliveryDate: row.order_delivery_date
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertRouteFound(row, routeId) {
  if (!row) {
    throw new AppError("Route not found for this vendor", {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      details: [
        {
          path: "routeId",
          message: `No route was found for ${routeId}`
        }
      ]
    });
  }
}

function assertStopFound(row, stopId) {
  if (!row) {
    throw new AppError("Route stop not found for this vendor", {
      statusCode: 404,
      code: "ROUTE_STOP_NOT_FOUND",
      details: [
        {
          path: "stopId",
          message: `No route stop was found for ${stopId}`
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
          message: "Route stops can only use customers linked to the current vendor"
        }
      ]
    });
  }

  return relationship;
}

async function resolveStopContext(vendorId, payload, currentStop = null) {
  let customerId = payload.customerId || currentStop?.customer_id;
  let order = null;

  if (payload.orderId) {
    order = await findOrderForVendor(vendorId, payload.orderId);

    if (!order) {
      throw new AppError("Order not found for this vendor", {
        statusCode: 422,
        code: "ORDER_NOT_AVAILABLE",
        details: [
          {
            path: "orderId",
            message: "Route stops can only reference orders in the current vendor"
          }
        ]
      });
    }

    if (payload.customerId && payload.customerId !== order.customer_id) {
      throw new AppError("Order customer does not match stop customer", {
        statusCode: 422,
        code: "ORDER_CUSTOMER_MISMATCH",
        details: [
          {
            path: "customerId",
            message: "When orderId is provided, customerId must match the order customer"
          }
        ]
      });
    }

    customerId = order.customer_id;
  }

  if (!customerId) {
    throw new AppError("Customer is required for route stops", {
      statusCode: 422,
      code: "CUSTOMER_REQUIRED",
      details: [
        {
          path: "customerId",
          message: "Provide customerId or an orderId that resolves to a customer"
        }
      ]
    });
  }

  const relationship = await assertCustomerLinkedToVendor(vendorId, customerId);

  return {
    customerId,
    relationship,
    order
  };
}

async function getRouteDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listRoutesForVendor({
    vendorId,
    status: query.status || null,
    routeDate: query.routeDate || null,
    driverName: query.driverName || null,
    vehicleLabel: query.vehicleLabel || null,
    search: query.search || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapRoute),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      status: query.status || null,
      routeDate: query.routeDate || null,
      driverName: query.driverName || null,
      vehicleLabel: query.vehicleLabel || null,
      search: query.search || null
    }
  };
}

async function getRouteDetail(vendorId, routeId) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stops = await listRouteStopsForVendor(vendorId, routeId);

  return {
    ...mapRoute(route),
    stops: stops.map(mapRouteStop)
  };
}

async function createRoute(vendorId, payload) {
  const route = await createRouteForVendor(vendorId, toColumnPayload(payload, ROUTE_FIELDS));

  return mapRoute(route);
}

async function updateRoute(vendorId, routeId, payload) {
  const existing = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(existing, routeId);

  const route = await updateRouteForVendor(vendorId, routeId, toColumnPayload(payload, ROUTE_FIELDS));

  assertRouteFound(route, routeId);

  return mapRoute(route);
}

async function getRouteStops(vendorId, routeId) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stops = await listRouteStopsForVendor(vendorId, routeId);

  return {
    route: mapRoute(route),
    items: stops.map(mapRouteStop)
  };
}

async function createRouteStop(vendorId, routeId, payload) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stopContext = await resolveStopContext(vendorId, payload);
  const stop = await createRouteStopForVendor(vendorId, routeId, {
    ...toColumnPayload(payload, STOP_FIELDS),
    customer_id: stopContext.customerId,
    vendor_customer_relationship_id: stopContext.relationship.id,
    order_id: payload.orderId || null
  });

  return mapRouteStop(stop);
}

async function updateRouteStop(vendorId, routeId, stopId, payload) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const existing = await findRouteStopForVendor(vendorId, routeId, stopId);

  assertStopFound(existing, stopId);

  const needsRelationshipRefresh = payload.customerId || Object.prototype.hasOwnProperty.call(payload, "orderId");
  const stopContext = needsRelationshipRefresh
    ? await resolveStopContext(vendorId, payload, existing)
    : null;
  const updates = {
    ...toColumnPayload(payload, STOP_FIELDS),
    customer_id: stopContext?.customerId,
    vendor_customer_relationship_id: stopContext?.relationship.id,
    order_id: Object.prototype.hasOwnProperty.call(payload, "orderId") ? payload.orderId || null : undefined
  };
  const stop = await updateRouteStopForVendor(vendorId, routeId, stopId, updates);

  assertStopFound(stop, stopId);

  return mapRouteStop(stop);
}

export {
  createRoute,
  createRouteStop,
  getRouteDetail,
  getRouteDirectory,
  getRouteStops,
  updateRoute,
  updateRouteStop
};
