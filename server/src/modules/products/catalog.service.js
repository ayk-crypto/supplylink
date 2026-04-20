import AppError from "../../core/errors/AppError.js";
import {
  createCategoryForVendor,
  createProductForVendor,
  findCategoryForVendor,
  findProductForVendor,
  listCategoriesForVendor,
  listProductsForVendor,
  updateCategoryForVendor,
  updateProductForVendor
} from "./catalog.repository.js";

const CATEGORY_FIELDS = {
  name: "name",
  slug: "slug",
  description: "description"
};

const PRODUCT_FIELDS = {
  sku: "sku",
  name: "name",
  description: "description",
  categoryId: "category_id",
  unitPrice: "unit_price",
  price: "unit_price",
  status: "status",
  lowStockThreshold: "low_stock_threshold",
  metadata: "metadata"
};

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function toColumnPayload(input = {}, fieldMap) {
  const payload = {};

  Object.entries(fieldMap).forEach(([inputKey, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      payload[column] = input[inputKey];
    }
  });

  return payload;
}

function mapCategory(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorId: row.vendor_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorId: row.vendor_id,
    categoryId: row.category_id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    unitPrice: row.unit_price,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    isLowStock: Number(row.stock_quantity || 0) <= Number(row.low_stock_threshold || 0),
    status: row.status,
    metadata: row.metadata || {},
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
          description: row.category_description
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertCategoryFound(row, categoryId) {
  if (!row) {
    throw new AppError("Category not found for this vendor", {
      statusCode: 404,
      code: "CATEGORY_NOT_FOUND",
      details: [
        {
          path: "categoryId",
          message: `No category was found for ${categoryId}`
        }
      ]
    });
  }
}

function assertProductFound(row, productId) {
  if (!row) {
    throw new AppError("Product not found for this vendor", {
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
      details: [
        {
          path: "productId",
          message: `No product was found for ${productId}`
        }
      ]
    });
  }
}

async function assertCategoryBelongsToVendor(vendorId, categoryId) {
  if (!categoryId) {
    return;
  }

  const category = await findCategoryForVendor(vendorId, categoryId);

  if (!category) {
    throw new AppError("Category not found for this vendor", {
      statusCode: 422,
      code: "CATEGORY_NOT_AVAILABLE",
      details: [
        {
          path: "categoryId",
          message: "Products can only be assigned to categories from the current vendor"
        }
      ]
    });
  }
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

async function getCategoryDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listCategoriesForVendor({
    vendorId,
    search: query.search || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapCategory),
    pagination: paginationMeta(query, result.total),
    filters: {
      search: query.search || null
    }
  };
}

async function getCategoryDetail(vendorId, categoryId) {
  const category = await findCategoryForVendor(vendorId, categoryId);

  assertCategoryFound(category, categoryId);

  return mapCategory(category);
}

async function createCategory(vendorId, payload) {
  const normalizedPayload = {
    ...payload,
    slug: payload.slug || slugify(payload.name)
  };

  if (!normalizedPayload.slug) {
    throw new AppError("Category slug could not be generated", {
      statusCode: 422,
      code: "CATEGORY_SLUG_REQUIRED",
      details: [
        {
          path: "slug",
          message: "Provide a slug or use a category name with letters or numbers"
        }
      ]
    });
  }

  const category = await createCategoryForVendor(
    vendorId,
    toColumnPayload(normalizedPayload, CATEGORY_FIELDS)
  );

  return mapCategory(category);
}

async function updateCategory(vendorId, categoryId, payload) {
  const existing = await findCategoryForVendor(vendorId, categoryId);

  assertCategoryFound(existing, categoryId);

  const category = await updateCategoryForVendor(
    vendorId,
    categoryId,
    toColumnPayload(payload, CATEGORY_FIELDS)
  );

  assertCategoryFound(category, categoryId);

  return mapCategory(category);
}

async function getProductDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listProductsForVendor({
    vendorId,
    search: query.search || null,
    status: query.status || null,
    categoryId: query.categoryId || null,
    sku: query.sku || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapProduct),
    pagination: paginationMeta(query, result.total),
    filters: {
      status: query.status || null,
      categoryId: query.categoryId || null,
      sku: query.sku || null,
      search: query.search || null
    }
  };
}

async function getProductDetail(vendorId, productId) {
  const product = await findProductForVendor(vendorId, productId);

  assertProductFound(product, productId);

  return mapProduct(product);
}

async function createProduct(vendorId, payload) {
  await assertCategoryBelongsToVendor(vendorId, payload.categoryId);

  const product = await createProductForVendor(vendorId, toColumnPayload(payload, PRODUCT_FIELDS));
  const productWithCategory = await findProductForVendor(vendorId, product.id);

  return mapProduct(productWithCategory);
}

async function updateProduct(vendorId, productId, payload) {
  const existing = await findProductForVendor(vendorId, productId);

  assertProductFound(existing, productId);

  if (Object.prototype.hasOwnProperty.call(payload, "categoryId")) {
    await assertCategoryBelongsToVendor(vendorId, payload.categoryId);
  }

  const product = await updateProductForVendor(
    vendorId,
    productId,
    toColumnPayload(payload, PRODUCT_FIELDS)
  );

  assertProductFound(product, productId);

  return getProductDetail(vendorId, product.id);
}

export {
  createCategory,
  createProduct,
  getCategoryDetail,
  getCategoryDirectory,
  getProductDetail,
  getProductDirectory,
  updateCategory,
  updateProduct
};
