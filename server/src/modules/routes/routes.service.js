import AppError from "../../core/errors/AppError.js";
import {
  createRouteForVendor,
  createRouteStopForVendor,
  findCustomerRelationshipForVendor,
  findOrderForVendor,
  findRouteForVendor,
  findRouteStopByOrderForVendor,
  findRouteStopForVendor,
  listEligibleOrdersForCustomers,
  listRouteStopsForVendor,
  listRoutesForVendor,
  updateRouteForVendor,
  updateRouteStopForVendor
} from "./routes.repository.js";
import { notifyVendorUsers, runNotificationTask } from "../notifications/notifications.service.js";

const ASSIGNABLE_ORDER_STATUSES = ["draft", "confirmed", "packed", "dispatched"];

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
    sourceRouteTemplateId: row.source_route_template_id,
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
  const assignedOrder = row.order_id
    ? {
        id: row.order_id,
        orderNumber: row.order_number,
        status: row.order_status,
        orderDate: row.order_order_date,
        deliveryDate: row.order_delivery_date,
        grandTotal: Number(row.order_grand_total || 0)
      }
    : null;

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
    order: assignedOrder,
    assignedOrders: assignedOrder ? [assignedOrder] : [],
    assignmentSummary: {
      orderCount: assignedOrder ? 1 : 0,
      orderValueTotal: assignedOrder ? Number(row.order_grand_total || 0) : 0
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAssignableOrder(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    vendorCustomerRelationshipId: row.vendor_customer_relationship_id,
    orderNumber: row.order_number,
    status: row.status,
    orderDate: row.order_date,
    deliveryDate: row.delivery_date,
    subtotal: row.subtotal !== undefined ? Number(row.subtotal || 0) : undefined,
    discountTotal: row.discount_total !== undefined ? Number(row.discount_total || 0) : undefined,
    taxTotal: row.tax_total !== undefined ? Number(row.tax_total || 0) : undefined,
    grandTotal: Number(row.grand_total || 0),
    notes: row.notes || null,
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

function buildRouteAssignmentSummary(stops) {
  return stops.reduce(
    (summary, stop) => {
      summary.assignedOrderCount += stop.assignmentSummary.orderCount;
      summary.assignedOrderValueTotal += Number(stop.assignmentSummary.orderValueTotal || 0);
      return summary;
    },
    {
      stopCount: stops.length,
      assignedOrderCount: 0,
      assignedOrderValueTotal: 0
    }
  );
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

function assertOrderStatusAssignable(order) {
  if (!ASSIGNABLE_ORDER_STATUSES.includes(order.status)) {
    throw new AppError("Order is not eligible for route assignment", {
      statusCode: 409,
      code: "ORDER_NOT_ASSIGNABLE",
      details: [
        {
          path: "orderId",
          message: `Only orders in statuses ${ASSIGNABLE_ORDER_STATUSES.join(", ")} can be assigned`
        }
      ]
    });
  }
}

async function assertOrderAssignableToStop(vendorId, routeId, stop, order) {
  void routeId;
  assertOrderStatusAssignable(order);

  if (!stop?.customer_id || stop.customer_id !== order.customer_id) {
    throw new AppError("Order customer does not match route stop customer", {
      statusCode: 422,
      code: "ORDER_CUSTOMER_MISMATCH",
      details: [
        {
          path: "orderId",
          message: "Assigned order must belong to the same customer as the route stop"
        }
      ]
    });
  }

  const existingAssignment = await findRouteStopByOrderForVendor(vendorId, order.id);

  if (existingAssignment && existingAssignment.id !== stop?.id) {
    throw new AppError("Order is already assigned to another route stop", {
      statusCode: 409,
      code: "ORDER_ALREADY_ASSIGNED",
      details: [
        {
          path: "orderId",
          message: "Unassign the order from its current stop before reassigning it"
        }
      ]
    });
  }
}

async function resolveStopContext(vendorId, routeId, payload, currentStop = null) {
  let customerId = payload.customerId || currentStop?.customer_id;
  let order = null;
  const hasOrderField = Object.prototype.hasOwnProperty.call(payload, "orderId");
  const resolvedOrderId = hasOrderField ? payload.orderId : currentStop?.order_id;

  if (resolvedOrderId) {
    order = await findOrderForVendor(vendorId, resolvedOrderId);

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

  if (order) {
    await assertOrderAssignableToStop(
      vendorId,
      routeId,
      {
        id: currentStop?.id || null,
        customer_id: customerId
      },
      order
    );
  }

  return {
    customerId,
    relationship,
    order
  };
}

async function buildRouteIntelligence(route, stopRows, vendorId, { includeEligibleOrders = false } = {}) {
  const mappedStops = stopRows.map(mapRouteStop);
  const summary = buildRouteAssignmentSummary(mappedStops);

  if (!includeEligibleOrders) {
    return {
      ...mapRoute(route),
      summary,
      stops: mappedStops
    };
  }

  const customerIds = [...new Set(mappedStops.map((stop) => stop.customerId).filter(Boolean))];
  const eligibleOrders = await listEligibleOrdersForCustomers(
    vendorId,
    customerIds,
    ASSIGNABLE_ORDER_STATUSES
  );
  const eligibleOrdersByCustomerId = new Map();

  eligibleOrders.map(mapAssignableOrder).forEach((order) => {
    const bucket = eligibleOrdersByCustomerId.get(order.customerId) || [];
    bucket.push(order);
    eligibleOrdersByCustomerId.set(order.customerId, bucket);
  });

  const enrichedStops = mappedStops.map((stop) => ({
    ...stop,
    eligibleOrders: eligibleOrdersByCustomerId.get(stop.customerId) || []
  }));

  return {
    ...mapRoute(route),
    summary,
    stops: enrichedStops
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

  return buildRouteIntelligence(route, stops, vendorId);
}

async function createRoute(vendorId, payload) {
  const route = await createRouteForVendor(vendorId, toColumnPayload(payload, ROUTE_FIELDS));

  const mappedRoute = mapRoute(route);

  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: "route.created",
      title: "Route created",
      message: `Route ${mappedRoute.name} was created${mappedRoute.routeDate ? ` for ${mappedRoute.routeDate}` : ""}.`,
      metadata: {
        routeId: mappedRoute.id,
        routeDate: mappedRoute.routeDate,
        status: mappedRoute.status
      }
    })
  );

  return mappedRoute;
}

async function updateRoute(vendorId, routeId, payload) {
  const existing = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(existing, routeId);

  const route = await updateRouteForVendor(vendorId, routeId, toColumnPayload(payload, ROUTE_FIELDS));

  assertRouteFound(route, routeId);

  const mappedRoute = mapRoute(route);

  runNotificationTask(
    notifyVendorUsers({
      vendorId,
      eventCode: "route.updated",
      title: "Route updated",
      message: `Route ${mappedRoute.name} was updated.`,
      metadata: {
        routeId: mappedRoute.id,
        routeDate: mappedRoute.routeDate,
        status: mappedRoute.status
      }
    })
  );

  return mappedRoute;
}

async function getRouteStops(vendorId, routeId) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stops = await listRouteStopsForVendor(vendorId, routeId);
  const detail = await buildRouteIntelligence(route, stops, vendorId);

  return {
    route: mapRoute(route),
    routeSummary: detail.summary,
    items: detail.stops
  };
}

async function createRouteStop(vendorId, routeId, payload) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stopContext = await resolveStopContext(vendorId, routeId, payload);
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
    ? await resolveStopContext(vendorId, routeId, payload, existing)
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

async function getRouteIntelligence(vendorId, routeId) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stops = await listRouteStopsForVendor(vendorId, routeId);

  return buildRouteIntelligence(route, stops, vendorId, { includeEligibleOrders: true });
}

async function assignOrderToRouteStop(vendorId, routeId, stopId, orderId) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stop = await findRouteStopForVendor(vendorId, routeId, stopId);

  assertStopFound(stop, stopId);

  const order = await findOrderForVendor(vendorId, orderId);

  if (!order) {
    throw new AppError("Order not found for this vendor", {
      statusCode: 404,
      code: "ORDER_NOT_FOUND",
      details: [
        {
          path: "orderId",
          message: `No order was found for ${orderId}`
        }
      ]
    });
  }

  await assertOrderAssignableToStop(vendorId, routeId, stop, order);

  const updated = await updateRouteStopForVendor(vendorId, routeId, stopId, {
    order_id: orderId
  });

  assertStopFound(updated, stopId);

  return mapRouteStop(updated);
}

async function unassignOrderFromRouteStop(vendorId, routeId, stopId, orderId) {
  const route = await findRouteForVendor(vendorId, routeId);

  assertRouteFound(route, routeId);

  const stop = await findRouteStopForVendor(vendorId, routeId, stopId);

  assertStopFound(stop, stopId);

  if (!stop.order_id) {
    throw new AppError("Route stop has no assigned order", {
      statusCode: 404,
      code: "ROUTE_STOP_ORDER_NOT_FOUND",
      details: [
        {
          path: "orderId",
          message: "There is no assigned order to remove from this route stop"
        }
      ]
    });
  }

  if (stop.order_id !== orderId) {
    throw new AppError("Requested order is not assigned to this route stop", {
      statusCode: 409,
      code: "ROUTE_STOP_ORDER_MISMATCH",
      details: [
        {
          path: "orderId",
          message: "The specified order is not the order currently assigned to this stop"
        }
      ]
    });
  }

  const updated = await updateRouteStopForVendor(vendorId, routeId, stopId, {
    order_id: null
  });

  assertStopFound(updated, stopId);

  return mapRouteStop(updated);
}

export {
  assignOrderToRouteStop,
  createRoute,
  createRouteStop,
  getRouteDetail,
  getRouteDirectory,
  getRouteIntelligence,
  getRouteStops,
  unassignOrderFromRouteStop,
  updateRoute,
  updateRouteStop
};
