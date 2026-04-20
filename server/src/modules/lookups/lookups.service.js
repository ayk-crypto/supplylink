import { LOOKUP_OPTION_GROUPS } from "./lookups.constants.js";
import {
  listCategoryLookupRows,
  listCustomerLookupRows,
  listProductLookupRows,
  listVendorLookupRows
} from "./lookups.repository.js";

function humanizeOption(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toOption(value) {
  return {
    value,
    label: humanizeOption(value)
  };
}

function buildLookupResponse({ items, search = null, limit, filters = {} }) {
  return {
    items,
    meta: {
      search,
      limit,
      filters
    }
  };
}

function mapCustomerLookup(row) {
  const label = row.company_name || row.full_name;
  const secondaryText = [row.full_name !== label ? row.full_name : null, row.email, row.phone]
    .filter(Boolean)
    .join(" | ");

  return {
    id: row.id,
    label,
    secondaryText: secondaryText || row.account_code || null,
    status: row.status,
    accountCode: row.account_code || null
  };
}

function mapProductLookup(row) {
  return {
    id: row.id,
    label: row.name,
    secondaryText: [row.sku, row.category_name].filter(Boolean).join(" | ") || null,
    status: row.status,
    sku: row.sku,
    unitPrice: Number(row.unit_price || 0),
    category: row.category_id
      ? {
          id: row.category_id,
          label: row.category_name
        }
      : null
  };
}

function mapCategoryLookup(row) {
  return {
    id: row.id,
    label: row.name,
    secondaryText: row.slug,
    slug: row.slug
  };
}

function mapVendorLookup(row) {
  return {
    id: row.id,
    label: row.display_name,
    secondaryText: [row.legal_name, row.slug, row.contact_email].filter(Boolean).join(" | ") || null,
    status: row.status,
    slug: row.slug
  };
}

async function getCustomerLookup(vendorId, query) {
  const limit = query.limit || 20;
  const rows = await listCustomerLookupRows({
    vendorId,
    search: query.search || null,
    limit
  });

  return buildLookupResponse({
    items: rows.map(mapCustomerLookup),
    search: query.search || null,
    limit
  });
}

async function getProductLookup(vendorId, query) {
  const limit = query.limit || 20;
  const rows = await listProductLookupRows({
    vendorId,
    search: query.search || null,
    status: query.status || "active",
    categoryId: query.categoryId || null,
    limit
  });

  return buildLookupResponse({
    items: rows.map(mapProductLookup),
    search: query.search || null,
    limit,
    filters: {
      status: query.status || "active",
      categoryId: query.categoryId || null
    }
  });
}

async function getCategoryLookup(vendorId, query) {
  const limit = query.limit || 20;
  const rows = await listCategoryLookupRows({
    vendorId,
    search: query.search || null,
    limit
  });

  return buildLookupResponse({
    items: rows.map(mapCategoryLookup),
    search: query.search || null,
    limit
  });
}

async function getVendorLookup(query) {
  const limit = query.limit || 20;
  const rows = await listVendorLookupRows({
    search: query.search || null,
    status: query.status || null,
    limit
  });

  return buildLookupResponse({
    items: rows.map(mapVendorLookup),
    search: query.search || null,
    limit,
    filters: {
      status: query.status || null
    }
  });
}

function getLookupOptions() {
  return Object.fromEntries(
    Object.entries(LOOKUP_OPTION_GROUPS).map(([group, values]) => [
      group,
      values.map(toOption)
    ])
  );
}

export {
  getCategoryLookup,
  getCustomerLookup,
  getLookupOptions,
  getProductLookup,
  getVendorLookup
};
