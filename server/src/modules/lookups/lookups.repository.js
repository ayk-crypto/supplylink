import { query } from "../../config/db.js";

async function listCustomerLookupRows({ vendorId, search = null, limit = 20 }) {
  const values = [vendorId];
  const conditions = ["relationship.vendor_id = $1"];

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

  values.push(limit);

  const result = await query(
    `SELECT customer.id,
            customer.full_name,
            customer.company_name,
            customer.email,
            customer.phone,
            relationship.account_code,
            relationship.status
     FROM vendor_customer_relationships relationship
     INNER JOIN customers customer ON customer.id = relationship.customer_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY relationship.created_at DESC, customer.full_name ASC
     LIMIT $${values.length}`,
    values
  );

  return result.rows;
}

async function listProductLookupRows({ vendorId, search = null, status = "active", categoryId = null, limit = 20 }) {
  const values = [vendorId];
  const conditions = ["product.vendor_id = $1"];

  if (status) {
    values.push(status);
    conditions.push(`product.status = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`product.category_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      product.name ILIKE $${values.length}
      OR product.sku ILIKE $${values.length}
      OR COALESCE(product.description, '') ILIKE $${values.length}
      OR COALESCE(category.name, '') ILIKE $${values.length}
    )`);
  }

  values.push(limit);

  const result = await query(
    `SELECT product.id,
            product.sku,
            product.name,
            product.status,
            product.unit_price,
            category.id AS category_id,
            category.name AS category_name
     FROM products product
     LEFT JOIN categories category
       ON category.id = product.category_id
      AND category.vendor_id = product.vendor_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY product.name ASC, product.sku ASC
     LIMIT $${values.length}`,
    values
  );

  return result.rows;
}

async function listCategoryLookupRows({ vendorId, search = null, limit = 20 }) {
  const values = [vendorId];
  const conditions = ["category.vendor_id = $1"];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      category.name ILIKE $${values.length}
      OR category.slug ILIKE $${values.length}
      OR COALESCE(category.description, '') ILIKE $${values.length}
    )`);
  }

  values.push(limit);

  const result = await query(
    `SELECT category.id,
            category.name,
            category.slug,
            category.description
     FROM categories category
     WHERE ${conditions.join(" AND ")}
     ORDER BY category.name ASC, category.created_at DESC
     LIMIT $${values.length}`,
    values
  );

  return result.rows;
}

async function listVendorLookupRows({ search = null, status = null, limit = 20 }) {
  const values = [];
  const conditions = [];

  if (status) {
    values.push(status);
    conditions.push(`vendor.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      vendor.display_name ILIKE $${values.length}
      OR vendor.legal_name ILIKE $${values.length}
      OR vendor.slug ILIKE $${values.length}
      OR COALESCE(vendor.contact_email, '') ILIKE $${values.length}
    )`);
  }

  values.push(limit);

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await query(
    `SELECT vendor.id,
            vendor.display_name,
            vendor.legal_name,
            vendor.slug,
            vendor.status,
            vendor.contact_email
     FROM vendors vendor
     ${whereClause}
     ORDER BY vendor.display_name ASC, vendor.created_at DESC
     LIMIT $${values.length}`,
    values
  );

  return result.rows;
}

export {
  listCategoryLookupRows,
  listCustomerLookupRows,
  listProductLookupRows,
  listVendorLookupRows
};
