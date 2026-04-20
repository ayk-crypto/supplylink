import { query, withTransaction } from "../../config/db.js";

const ROUTE_SELECT = `route.id,
                      route.vendor_id,
                      route.name,
                      route.route_date,
                      route.status,
                      route.driver_user_id,
                      route.vehicle_label,
                      route.source_route_template_id,
                      route.notes,
                      route.metadata,
                      route.created_at,
                      route.updated_at,
                      driver.full_name AS driver_full_name,
                      driver.email AS driver_email`;

const ROUTE_RETURNING = `id,
                         vendor_id,
                         name,
                         route_date,
                         status,
                         driver_user_id,
                         vehicle_label,
                         source_route_template_id,
                         notes,
                         metadata,
                         created_at,
                         updated_at`;

const STOP_SELECT = `stop.id,
                     stop.route_id,
                     stop.vendor_id,
                     stop.customer_id,
                     stop.vendor_customer_relationship_id,
                     stop.order_id,
                     stop.sequence_number,
                     stop.stop_type,
                     stop.status,
                     stop.planned_arrival_at,
                     stop.actual_arrival_at,
                     stop.notes,
                     stop.metadata,
                     stop.created_at,
                     stop.updated_at,
                     customer.full_name AS customer_full_name,
                     customer.company_name AS customer_company_name,
                     customer.email AS customer_email,
                     customer.phone AS customer_phone,
                     relationship.account_code AS customer_account_code,
                     relationship.status AS customer_relationship_status,
                     orders.order_number,
                     orders.status AS order_status,
                     orders.delivery_date AS order_delivery_date`;

function routeJoinClause() {
  return `FROM routes route
          LEFT JOIN users driver ON driver.id = route.driver_user_id`;
}

function stopJoinClause() {
  return `FROM route_stops stop
          LEFT JOIN customers customer ON customer.id = stop.customer_id
          LEFT JOIN vendor_customer_relationships relationship
            ON relationship.id = stop.vendor_customer_relationship_id
           AND relationship.vendor_id = stop.vendor_id
          LEFT JOIN orders
            ON orders.id = stop.order_id
           AND orders.vendor_id = stop.vendor_id`;
}

async function listRoutesForVendor({
  vendorId,
  status = null,
  routeDate = null,
  driverName = null,
  vehicleLabel = null,
  search = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["route.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`route.status = $${values.length}`);
  }

  if (routeDate) {
    values.push(routeDate);
    conditions.push(`route.route_date = $${values.length}`);
  }

  if (driverName) {
    values.push(`%${driverName}%`);
    conditions.push(`COALESCE(driver.full_name, '') ILIKE $${values.length}`);
  }

  if (vehicleLabel) {
    values.push(`%${vehicleLabel}%`);
    conditions.push(`COALESCE(route.vehicle_label, '') ILIKE $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      route.name ILIKE $${values.length}
      OR COALESCE(route.vehicle_label, '') ILIKE $${values.length}
      OR COALESCE(route.notes, '') ILIKE $${values.length}
      OR COALESCE(driver.full_name, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${routeJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${ROUTE_SELECT}
     ${routeJoinClause()}
     ${whereClause}
     ORDER BY route.route_date DESC NULLS LAST, route.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findRouteForVendor(vendorId, routeId, client = { query }) {
  const result = await client.query(
    `SELECT ${ROUTE_SELECT}
     ${routeJoinClause()}
     WHERE route.vendor_id = $1
       AND route.id = $2
     LIMIT 1`,
    [vendorId, routeId]
  );

  return result.rows[0] || null;
}

async function createRouteForVendor(vendorId, payload) {
  const result = await query(
    `INSERT INTO routes (
       vendor_id,
       name,
       route_date,
       status,
       driver_user_id,
       vehicle_label,
       source_route_template_id,
       notes,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${ROUTE_RETURNING}`,
    [
      vendorId,
      payload.name,
      payload.route_date || null,
      payload.status || "draft",
      payload.driver_user_id || null,
      payload.vehicle_label || null,
      payload.source_route_template_id || null,
      payload.notes || null,
      payload.metadata || {}
    ]
  );

  return result.rows[0] || null;
}

async function updateRouteForVendor(vendorId, routeId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findRouteForVendor(vendorId, routeId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);
  values.push(routeId);

  const result = await query(
    `UPDATE routes route
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE route.vendor_id = $${values.length - 1}
       AND route.id = $${values.length}
     RETURNING ${ROUTE_RETURNING}`,
    values
  );

  return result.rows[0] || null;
}

async function listRouteStopsForVendor(vendorId, routeId, client = { query }) {
  const result = await client.query(
    `SELECT ${STOP_SELECT}
     ${stopJoinClause()}
     WHERE stop.vendor_id = $1
       AND stop.route_id = $2
     ORDER BY stop.sequence_number ASC, stop.created_at ASC`,
    [vendorId, routeId]
  );

  return result.rows;
}

async function findRouteStopForVendor(vendorId, routeId, stopId, client = { query }) {
  const result = await client.query(
    `SELECT ${STOP_SELECT}
     ${stopJoinClause()}
     WHERE stop.vendor_id = $1
       AND stop.route_id = $2
       AND stop.id = $3
     LIMIT 1`,
    [vendorId, routeId, stopId]
  );

  return result.rows[0] || null;
}

async function findCustomerRelationshipForVendor(vendorId, customerId, client = { query }) {
  const result = await client.query(
    `SELECT relationship.id,
            relationship.vendor_id,
            relationship.customer_id,
            relationship.status,
            relationship.account_code,
            customer.full_name,
            customer.company_name,
            customer.email,
            customer.phone
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     WHERE relationship.vendor_id = $1
       AND relationship.customer_id = $2
     LIMIT 1`,
    [vendorId, customerId]
  );

  return result.rows[0] || null;
}

async function findOrderForVendor(vendorId, orderId, client = { query }) {
  const result = await client.query(
    `SELECT id,
            vendor_id,
            customer_id,
            vendor_customer_relationship_id,
            order_number,
            status,
            delivery_date
     FROM orders
     WHERE vendor_id = $1
       AND id = $2
     LIMIT 1`,
    [vendorId, orderId]
  );

  return result.rows[0] || null;
}

async function createRouteStopForVendor(vendorId, routeId, payload) {
  return withTransaction(async (client) => {
    await client.query(
      `UPDATE route_stops
       SET sequence_number = sequence_number + 10000,
           updated_at = NOW()
       WHERE vendor_id = $1
         AND route_id = $2
         AND sequence_number >= $3`,
      [vendorId, routeId, payload.sequence_number]
    );
    await client.query(
      `UPDATE route_stops
       SET sequence_number = sequence_number - 9999
       WHERE vendor_id = $1
         AND route_id = $2
         AND sequence_number >= 10000`,
      [vendorId, routeId]
    );

    const result = await client.query(
      `INSERT INTO route_stops (
         route_id,
         vendor_id,
         customer_id,
         vendor_customer_relationship_id,
         order_id,
         sequence_number,
         stop_type,
         status,
         planned_arrival_at,
         actual_arrival_at,
         notes,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        routeId,
        vendorId,
        payload.customer_id,
        payload.vendor_customer_relationship_id,
        payload.order_id || null,
        payload.sequence_number,
        payload.stop_type || null,
        payload.status || "pending",
        payload.planned_arrival_at || null,
        payload.actual_arrival_at || null,
        payload.notes || null,
        payload.metadata || {}
      ]
    );

    return findRouteStopForVendor(vendorId, routeId, result.rows[0].id, client);
  });
}

async function updateRouteStopForVendor(vendorId, routeId, stopId, updates) {
  return withTransaction(async (client) => {
    const current = await findRouteStopForVendor(vendorId, routeId, stopId, client);

    if (!current) {
      return null;
    }

    if (
      updates.sequence_number !== undefined &&
      updates.sequence_number !== current.sequence_number
    ) {
      await client.query(
        `UPDATE route_stops
         SET sequence_number = 0,
             updated_at = NOW()
         WHERE vendor_id = $1
           AND route_id = $2
           AND id = $3`,
        [vendorId, routeId, stopId]
      );

      const lowSequence = Math.min(current.sequence_number, updates.sequence_number);
      const highSequence = Math.max(current.sequence_number, updates.sequence_number);

      await client.query(
        `UPDATE route_stops
         SET sequence_number = sequence_number + 10000,
             updated_at = NOW()
         WHERE vendor_id = $1
           AND route_id = $2
           AND sequence_number >= $3
           AND sequence_number <= $4`,
        [vendorId, routeId, lowSequence, highSequence]
      );

      if (updates.sequence_number > current.sequence_number) {
        await client.query(
          `UPDATE route_stops
           SET sequence_number = sequence_number - 10001
           WHERE vendor_id = $1
             AND route_id = $2
             AND sequence_number > 10000`,
          [vendorId, routeId]
        );
      } else {
        await client.query(
          `UPDATE route_stops
           SET sequence_number = sequence_number - 9999
           WHERE vendor_id = $1
             AND route_id = $2
             AND sequence_number > 10000`,
          [vendorId, routeId]
        );
      }
    }

    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

    if (entries.length > 0) {
      const values = [];
      const setClauses = entries.map(([column, value], index) => {
        values.push(value);
        return `${column} = $${index + 1}`;
      });

      values.push(vendorId);
      values.push(routeId);
      values.push(stopId);

      await client.query(
        `UPDATE route_stops stop
         SET ${setClauses.join(", ")},
             updated_at = NOW()
         WHERE stop.vendor_id = $${values.length - 2}
           AND stop.route_id = $${values.length - 1}
           AND stop.id = $${values.length}`,
        values
      );
    }

    return findRouteStopForVendor(vendorId, routeId, stopId, client);
  });
}

export {
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
};
