import { query, withTransaction } from "../../config/db.js";

const CUSTOMER_SELECT = `customer.id,
                         customer.full_name,
                         customer.company_name,
                         customer.email,
                         customer.phone,
                         customer.tax_identifier,
                         customer.billing_address,
                         customer.shipping_address,
                         customer.metadata,
                         customer.created_at,
                         customer.updated_at`;

const CUSTOMER_RETURNING = `id,
                            full_name,
                            company_name,
                            email,
                            phone,
                            tax_identifier,
                            billing_address,
                            shipping_address,
                            metadata,
                            created_at,
                            updated_at`;

const RELATIONSHIP_SELECT = `relationship.id AS relationship_id,
                             relationship.vendor_id,
                             relationship.customer_id,
                             relationship.account_code,
                             relationship.status AS relationship_status,
                             relationship.credit_limit,
                             relationship.price_list_code,
                             relationship.notes AS relationship_notes,
                             relationship.metadata AS relationship_metadata,
                             relationship.created_at AS relationship_created_at,
                             relationship.updated_at AS relationship_updated_at`;

const RELATIONSHIP_RETURNING = `id AS relationship_id,
                                vendor_id,
                                customer_id,
                                account_code,
                                status AS relationship_status,
                                credit_limit,
                                price_list_code,
                                notes AS relationship_notes,
                                metadata AS relationship_metadata,
                                created_at AS relationship_created_at,
                                updated_at AS relationship_updated_at`;

function buildCustomerRelationshipRowSelect() {
  return `${CUSTOMER_SELECT}, ${RELATIONSHIP_SELECT}`;
}

async function listCustomersForVendor({
  vendorId,
  search = null,
  status = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["relationship.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`relationship.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      customer.full_name ILIKE $${values.length}
      OR COALESCE(customer.company_name, '') ILIKE $${values.length}
      OR COALESCE(customer.email, '') ILIKE $${values.length}
      OR COALESCE(customer.phone, '') ILIKE $${values.length}
      OR COALESCE(relationship.account_code, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${buildCustomerRelationshipRowSelect()}
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     ${whereClause}
     ORDER BY relationship.created_at DESC, customer.full_name ASC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findCustomerForVendor(vendorId, customerId) {
  const result = await query(
    `SELECT ${buildCustomerRelationshipRowSelect()}
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     WHERE relationship.vendor_id = $1
       AND relationship.customer_id = $2
     LIMIT 1`,
    [vendorId, customerId]
  );

  return result.rows[0] || null;
}

async function findCustomerMasterByIdentity({ email = null, phone = null }, client = { query }) {
  const conditions = [];
  const values = [];

  if (email) {
    values.push(email);
    conditions.push(`LOWER(email) = LOWER($${values.length})`);
  }

  if (phone) {
    values.push(phone);
    conditions.push(`phone = $${values.length}`);
  }

  if (conditions.length === 0) {
    return null;
  }

  const result = await client.query(
    `SELECT ${CUSTOMER_SELECT}
     FROM customers customer
     WHERE ${conditions.join(" OR ")}
     ORDER BY
       CASE WHEN $1::text IS NOT NULL AND LOWER(email) = LOWER($1::text) THEN 0 ELSE 1 END,
       created_at ASC
     LIMIT 1`,
    values
  );

  return result.rows[0] || null;
}

async function createCustomerMaster(payload, client) {
  const result = await client.query(
    `INSERT INTO customers (
       full_name,
       company_name,
       email,
       phone,
       tax_identifier,
       billing_address,
       shipping_address,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${CUSTOMER_RETURNING}`,
    [
      payload.full_name,
      payload.company_name || null,
      payload.email || null,
      payload.phone || null,
      payload.tax_identifier || null,
      payload.billing_address || {},
      payload.shipping_address || {},
      payload.metadata || {}
    ]
  );

  return result.rows[0] || null;
}

async function findVendorCustomerRelationship(vendorId, customerId, client = { query }) {
  const result = await client.query(
    `SELECT ${RELATIONSHIP_SELECT}
     FROM vendor_customer_relationships relationship
     WHERE relationship.vendor_id = $1
       AND relationship.customer_id = $2
     LIMIT 1`,
    [vendorId, customerId]
  );

  return result.rows[0] || null;
}

async function createVendorCustomerRelationship({ vendorId, customerId, relationship }, client) {
  const result = await client.query(
    `INSERT INTO vendor_customer_relationships (
       vendor_id,
       customer_id,
       account_code,
       status,
       credit_limit,
       price_list_code,
       notes,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${RELATIONSHIP_RETURNING}`,
    [
      vendorId,
      customerId,
      relationship.account_code || null,
      relationship.status || "active",
      relationship.credit_limit || 0,
      relationship.price_list_code || null,
      relationship.notes || null,
      relationship.metadata || {}
    ]
  );

  return result.rows[0] || null;
}

async function createCustomerAndRelationship({ vendorId, customer, relationship }) {
  return withTransaction(async (client) => {
    const existingCustomer = await findCustomerMasterByIdentity(
      {
        email: customer.email || null,
        phone: customer.phone || null
      },
      client
    );

    const customerRecord = existingCustomer || (await createCustomerMaster(customer, client));
    const existingRelationship = await findVendorCustomerRelationship(
      vendorId,
      customerRecord.id,
      client
    );

    if (existingRelationship) {
      return {
        customer: customerRecord,
        relationship: existingRelationship,
        relationshipAlreadyExists: true,
        reusedCustomer: Boolean(existingCustomer)
      };
    }

    const relationshipRecord = await createVendorCustomerRelationship(
      {
        vendorId,
        customerId: customerRecord.id,
        relationship
      },
      client
    );

    return {
      customer: customerRecord,
      relationship: relationshipRecord,
      relationshipAlreadyExists: false,
      reusedCustomer: Boolean(existingCustomer)
    };
  });
}

async function updateCustomerForVendor({ vendorId, customerId, customerUpdates, relationshipUpdates }) {
  return withTransaction(async (client) => {
    if (Object.keys(customerUpdates).length > 0) {
      const entries = Object.entries(customerUpdates).filter(([, value]) => value !== undefined);

      if (entries.length > 0) {
        const values = [];
        const setClauses = entries.map(([column, value], index) => {
          values.push(value);
          return `${column} = $${index + 1}`;
        });

        values.push(customerId);

        await client.query(
          `UPDATE customers
           SET ${setClauses.join(", ")},
               updated_at = NOW()
           WHERE id = $${values.length}`,
          values
        );
      }
    }

    if (Object.keys(relationshipUpdates).length > 0) {
      const entries = Object.entries(relationshipUpdates).filter(([, value]) => value !== undefined);

      if (entries.length > 0) {
        const values = [];
        const setClauses = entries.map(([column, value], index) => {
          values.push(value);
          return `${column} = $${index + 1}`;
        });

        values.push(vendorId);
        values.push(customerId);

        await client.query(
          `UPDATE vendor_customer_relationships relationship
           SET ${setClauses.join(", ")},
               updated_at = NOW()
           WHERE relationship.vendor_id = $${values.length - 1}
             AND relationship.customer_id = $${values.length}`,
          values
        );
      }
    }

    const result = await client.query(
      `SELECT ${buildCustomerRelationshipRowSelect()}
       FROM vendor_customer_relationships relationship
       INNER JOIN customers customer ON customer.id = relationship.customer_id
       WHERE relationship.vendor_id = $1
         AND relationship.customer_id = $2
       LIMIT 1`,
      [vendorId, customerId]
    );

    return result.rows[0] || null;
  });
}

export {
  createCustomerAndRelationship,
  findCustomerForVendor,
  listCustomersForVendor,
  updateCustomerForVendor
};
