import { query } from "../../config/db.js";

const CATEGORY_SELECT = `category.id,
                         category.vendor_id,
                         category.name,
                         category.slug,
                         category.description,
                         category.created_at,
                         category.updated_at`;

const CATEGORY_RETURNING = `id,
                            vendor_id,
                            name,
                            slug,
                            description,
                            created_at,
                            updated_at`;

const PRODUCT_SELECT = `product.id,
                        product.vendor_id,
                        product.category_id,
                        product.sku,
                        product.name,
                        product.description,
                        product.unit_price,
                        product.status,
                        product.metadata,
                        product.created_at,
                        product.updated_at,
                        category.name AS category_name,
                        category.slug AS category_slug,
                        category.description AS category_description`;

const PRODUCT_RETURNING = `id,
                           vendor_id,
                           category_id,
                           sku,
                           name,
                           description,
                           unit_price,
                           status,
                           metadata,
                           created_at,
                           updated_at`;

async function listCategoriesForVendor({ vendorId, search = null, limit = 20, offset = 0 }) {
  const conditions = ["category.vendor_id = $1"];
  const values = [vendorId];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      category.name ILIKE $${values.length}
      OR category.slug ILIKE $${values.length}
      OR COALESCE(category.description, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM categories category
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${CATEGORY_SELECT}
     FROM categories category
     ${whereClause}
     ORDER BY category.name ASC, category.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findCategoryForVendor(vendorId, categoryId) {
  const result = await query(
    `SELECT ${CATEGORY_SELECT}
     FROM categories category
     WHERE category.vendor_id = $1
       AND category.id = $2
     LIMIT 1`,
    [vendorId, categoryId]
  );

  return result.rows[0] || null;
}

async function createCategoryForVendor(vendorId, payload) {
  const result = await query(
    `INSERT INTO categories (
       vendor_id,
       name,
       slug,
       description
     )
     VALUES ($1, $2, $3, $4)
     RETURNING ${CATEGORY_RETURNING}`,
    [vendorId, payload.name, payload.slug, payload.description || null]
  );

  return result.rows[0] || null;
}

async function updateCategoryForVendor(vendorId, categoryId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findCategoryForVendor(vendorId, categoryId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);
  values.push(categoryId);

  const result = await query(
    `UPDATE categories category
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE category.vendor_id = $${values.length - 1}
       AND category.id = $${values.length}
     RETURNING ${CATEGORY_RETURNING}`,
    values
  );

  return result.rows[0] || null;
}

async function listProductsForVendor({
  vendorId,
  search = null,
  status = null,
  categoryId = null,
  sku = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["product.vendor_id = $1"];
  const values = [vendorId];

  if (status) {
    values.push(status);
    conditions.push(`product.status = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`product.category_id = $${values.length}`);
  }

  if (sku) {
    values.push(sku);
    conditions.push(`product.sku = $${values.length}`);
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

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM products product
     LEFT JOIN categories category
       ON category.id = product.category_id
      AND category.vendor_id = product.vendor_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${PRODUCT_SELECT}
     FROM products product
     LEFT JOIN categories category
       ON category.id = product.category_id
      AND category.vendor_id = product.vendor_id
     ${whereClause}
     ORDER BY product.created_at DESC, product.name ASC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findProductForVendor(vendorId, productId) {
  const result = await query(
    `SELECT ${PRODUCT_SELECT}
     FROM products product
     LEFT JOIN categories category
       ON category.id = product.category_id
      AND category.vendor_id = product.vendor_id
     WHERE product.vendor_id = $1
       AND product.id = $2
     LIMIT 1`,
    [vendorId, productId]
  );

  return result.rows[0] || null;
}

async function createProductForVendor(vendorId, payload) {
  const result = await query(
    `INSERT INTO products (
       vendor_id,
       category_id,
       sku,
       name,
       description,
       unit_price,
       status,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PRODUCT_RETURNING}`,
    [
      vendorId,
      payload.category_id || null,
      payload.sku,
      payload.name,
      payload.description || null,
      payload.unit_price || 0,
      payload.status || "active",
      payload.metadata || {}
    ]
  );

  return result.rows[0] || null;
}

async function updateProductForVendor(vendorId, productId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findProductForVendor(vendorId, productId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);
  values.push(productId);

  const result = await query(
    `UPDATE products product
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE product.vendor_id = $${values.length - 1}
       AND product.id = $${values.length}
     RETURNING ${PRODUCT_RETURNING}`,
    values
  );

  return result.rows[0] || null;
}

export {
  createCategoryForVendor,
  createProductForVendor,
  findCategoryForVendor,
  findProductForVendor,
  listCategoriesForVendor,
  listProductsForVendor,
  updateCategoryForVendor,
  updateProductForVendor
};
