import { query, withTransaction } from "../../config/db.js";

const TEMPLATE_SELECT = `template.id,
                         template.vendor_id,
                         template.name,
                         template.notes,
                         template.vehicle_label,
                         template.is_active,
                         template.recurrence_type,
                         template.recurrence_days,
                         template.created_at,
                         template.updated_at,
                         COUNT(stop.id)::int AS stop_count`;

const TEMPLATE_GROUP_BY = `template.id,
                           template.vendor_id,
                           template.name,
                           template.notes,
                           template.vehicle_label,
                           template.is_active,
                           template.recurrence_type,
                           template.recurrence_days,
                           template.created_at,
                           template.updated_at`;

const TEMPLATE_STOP_SELECT = `stop.id,
                              stop.template_id,
                              template.vendor_id,
                              stop.customer_id,
                              stop.sequence_number,
                              stop.notes,
                              stop.created_at,
                              stop.updated_at,
                              customer.full_name AS customer_full_name,
                              customer.company_name AS customer_company_name,
                              customer.email AS customer_email,
                              customer.phone AS customer_phone,
                              relationship.id AS vendor_customer_relationship_id,
                              relationship.account_code AS customer_account_code,
                              relationship.status AS customer_relationship_status`;

const GENERATED_ROUTE_RETURNING = `id,
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

const GENERATED_STOP_SELECT = `stop.id,
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
                               relationship.status AS customer_relationship_status`;

function templateJoinClause() {
  return `FROM route_templates template
          LEFT JOIN route_template_stops stop ON stop.template_id = template.id`;
}

function templateStopJoinClause() {
  return `FROM route_template_stops stop
          INNER JOIN route_templates template ON template.id = stop.template_id
          INNER JOIN customers customer ON customer.id = stop.customer_id
          LEFT JOIN vendor_customer_relationships relationship
            ON relationship.vendor_id = template.vendor_id
           AND relationship.customer_id = stop.customer_id`;
}

async function listRouteTemplatesForVendor({
  vendorId,
  search = null,
  isActive = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["template.vendor_id = $1"];
  const values = [vendorId];

  if (isActive !== null) {
    values.push(isActive);
    conditions.push(`template.is_active = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      template.name ILIKE $${values.length}
      OR COALESCE(template.notes, '') ILIKE $${values.length}
      OR COALESCE(template.vehicle_label, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM route_templates template
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${TEMPLATE_SELECT}
     ${templateJoinClause()}
     ${whereClause}
     GROUP BY ${TEMPLATE_GROUP_BY}
     ORDER BY template.name ASC, template.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findRouteTemplateForVendor(vendorId, templateId, client = { query }) {
  const result = await client.query(
    `SELECT ${TEMPLATE_SELECT}
     ${templateJoinClause()}
     WHERE template.vendor_id = $1
       AND template.id = $2
     GROUP BY ${TEMPLATE_GROUP_BY}
     LIMIT 1`,
    [vendorId, templateId]
  );

  return result.rows[0] || null;
}

async function createRouteTemplateForVendor(vendorId, payload) {
  const result = await query(
    `INSERT INTO route_templates (
       vendor_id,
       name,
       notes,
       vehicle_label,
       is_active,
       recurrence_type,
       recurrence_days
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      vendorId,
      payload.name,
      payload.notes || null,
      payload.vehicle_label || null,
      payload.is_active ?? true,
      payload.recurrence_type || "weekly",
      payload.recurrence_days
    ]
  );

  return findRouteTemplateForVendor(vendorId, result.rows[0].id);
}

async function updateRouteTemplateForVendor(vendorId, templateId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findRouteTemplateForVendor(vendorId, templateId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);
  values.push(templateId);

  const result = await query(
    `UPDATE route_templates template
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE template.vendor_id = $${values.length - 1}
       AND template.id = $${values.length}
     RETURNING template.id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return findRouteTemplateForVendor(vendorId, templateId);
}

async function deleteRouteTemplateForVendor(vendorId, templateId) {
  const result = await query(
    `DELETE FROM route_templates template
     WHERE template.vendor_id = $1
       AND template.id = $2
     RETURNING template.id`,
    [vendorId, templateId]
  );

  return result.rows[0] || null;
}

async function listTemplateStopsForVendor(vendorId, templateId, client = { query }) {
  const result = await client.query(
    `SELECT ${TEMPLATE_STOP_SELECT}
     ${templateStopJoinClause()}
     WHERE template.vendor_id = $1
       AND stop.template_id = $2
     ORDER BY stop.sequence_number ASC, stop.created_at ASC`,
    [vendorId, templateId]
  );

  return result.rows;
}

async function findTemplateStopForVendor(vendorId, templateId, stopId, client = { query }) {
  const result = await client.query(
    `SELECT ${TEMPLATE_STOP_SELECT}
     ${templateStopJoinClause()}
     WHERE template.vendor_id = $1
       AND stop.template_id = $2
       AND stop.id = $3
     LIMIT 1`,
    [vendorId, templateId, stopId]
  );

  return result.rows[0] || null;
}

async function findTemplateStopBySequence(vendorId, templateId, sequenceNumber, client = { query }) {
  const result = await client.query(
    `SELECT stop.id
     FROM route_template_stops stop
     INNER JOIN route_templates template ON template.id = stop.template_id
     WHERE template.vendor_id = $1
       AND stop.template_id = $2
       AND stop.sequence_number = $3
     LIMIT 1`,
    [vendorId, templateId, sequenceNumber]
  );

  return result.rows[0] || null;
}

async function findCustomerRelationshipForVendor(vendorId, customerId, client = { query }) {
  const result = await client.query(
    `SELECT relationship.id,
            relationship.vendor_id,
            relationship.customer_id,
            relationship.status,
            relationship.account_code
     FROM vendor_customer_relationships relationship
     WHERE relationship.vendor_id = $1
       AND relationship.customer_id = $2
     LIMIT 1`,
    [vendorId, customerId]
  );

  return result.rows[0] || null;
}

async function createTemplateStopForVendor(vendorId, templateId, payload) {
  const result = await query(
    `INSERT INTO route_template_stops (
       template_id,
       customer_id,
       sequence_number,
       notes
     )
     SELECT template.id, $3, $4, $5
     FROM route_templates template
     WHERE template.vendor_id = $1
       AND template.id = $2
     RETURNING id`,
    [vendorId, templateId, payload.customer_id, payload.sequence_number, payload.notes || null]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findTemplateStopForVendor(vendorId, templateId, result.rows[0].id);
}

async function updateTemplateStopForVendor(vendorId, templateId, stopId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findTemplateStopForVendor(vendorId, templateId, stopId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);
  values.push(templateId);
  values.push(stopId);

  const result = await query(
    `UPDATE route_template_stops stop
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     FROM route_templates template
     WHERE template.id = stop.template_id
       AND template.vendor_id = $${values.length - 2}
       AND stop.template_id = $${values.length - 1}
       AND stop.id = $${values.length}
     RETURNING stop.id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return findTemplateStopForVendor(vendorId, templateId, stopId);
}

async function deleteTemplateStopForVendor(vendorId, templateId, stopId) {
  const result = await query(
    `DELETE FROM route_template_stops stop
     USING route_templates template
     WHERE template.id = stop.template_id
       AND template.vendor_id = $1
       AND stop.template_id = $2
       AND stop.id = $3
     RETURNING stop.id`,
    [vendorId, templateId, stopId]
  );

  return result.rows[0] || null;
}

async function generateRouteFromTemplate({ vendorId, template, stops, route }) {
  return withTransaction(async (client) => {
    const routeResult = await client.query(
      `INSERT INTO routes (
         vendor_id,
         name,
         route_date,
         status,
         vehicle_label,
         source_route_template_id,
         notes,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${GENERATED_ROUTE_RETURNING}`,
      [
        vendorId,
        route.name,
        route.route_date,
        route.status,
        route.vehicle_label,
        template.id,
        route.notes,
        route.metadata
      ]
    );
    const generatedRoute = routeResult.rows[0];

    for (const stop of stops) {
      await client.query(
        `INSERT INTO route_stops (
           route_id,
           vendor_id,
           customer_id,
           vendor_customer_relationship_id,
           sequence_number,
           status,
           notes,
           metadata
         )
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
        [
          generatedRoute.id,
          vendorId,
          stop.customer_id,
          stop.vendor_customer_relationship_id,
          stop.sequence_number,
          stop.notes || null,
          {
            sourceRouteTemplateId: template.id,
            sourceRouteTemplateStopId: stop.id
          }
        ]
      );
    }

    const stopsResult = await client.query(
      `SELECT ${GENERATED_STOP_SELECT}
       FROM route_stops stop
       INNER JOIN customers customer ON customer.id = stop.customer_id
       LEFT JOIN vendor_customer_relationships relationship
         ON relationship.id = stop.vendor_customer_relationship_id
        AND relationship.vendor_id = stop.vendor_id
       WHERE stop.vendor_id = $1
         AND stop.route_id = $2
       ORDER BY stop.sequence_number ASC, stop.created_at ASC`,
      [vendorId, generatedRoute.id]
    );

    return {
      route: generatedRoute,
      stops: stopsResult.rows
    };
  });
}

export {
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
};
