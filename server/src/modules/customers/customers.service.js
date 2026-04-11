import AppError from "../../core/errors/AppError.js";
import {
  createCustomerAndRelationship,
  findCustomerForVendor,
  listCustomersForVendor,
  updateCustomerForVendor
} from "./customers.repository.js";

const CUSTOMER_CREATE_FIELDS = {
  fullName: "full_name",
  companyName: "company_name",
  email: "email",
  phone: "phone",
  taxIdentifier: "tax_identifier",
  billingAddress: "billing_address",
  shippingAddress: "shipping_address",
  metadata: "metadata"
};

const CUSTOMER_UPDATE_FIELDS = CUSTOMER_CREATE_FIELDS;

const RELATIONSHIP_FIELDS = {
  accountCode: "account_code",
  status: "status",
  creditLimit: "credit_limit",
  priceListCode: "price_list_code",
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

function mapCustomer(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    companyName: row.company_name,
    email: row.email,
    phone: row.phone,
    taxIdentifier: row.tax_identifier,
    billingAddress: row.billing_address || {},
    shippingAddress: row.shipping_address || {},
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRelationship(row) {
  return {
    id: row.relationship_id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    accountCode: row.account_code,
    status: row.relationship_status,
    creditLimit: row.credit_limit,
    priceListCode: row.price_list_code,
    notes: row.relationship_notes,
    metadata: row.relationship_metadata || {},
    linkedAt: row.relationship_created_at,
    createdAt: row.relationship_created_at,
    updatedAt: row.relationship_updated_at
  };
}

function mapCustomerWithRelationship(row) {
  if (!row) {
    return null;
  }

  return {
    customer: mapCustomer(row),
    relationship: mapRelationship(row)
  };
}

function assertCustomerFound(row, customerId) {
  if (!row) {
    throw new AppError("Customer not found for this vendor", {
      statusCode: 404,
      code: "CUSTOMER_NOT_FOUND",
      details: [
        {
          path: "customerId",
          message: `No linked customer was found for ${customerId}`
        }
      ]
    });
  }
}

async function getCustomerDirectory(vendorId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const result = await listCustomersForVendor({
    vendorId,
    search: query.search || null,
    status: query.status || null,
    limit: pageSize,
    offset
  });

  return {
    items: result.rows.map(mapCustomerWithRelationship),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      status: query.status || null,
      search: query.search || null
    }
  };
}

async function getCustomerDetail(vendorId, customerId) {
  const row = await findCustomerForVendor(vendorId, customerId);

  assertCustomerFound(row, customerId);

  return mapCustomerWithRelationship(row);
}

async function createCustomerForVendor(vendorId, payload) {
  const result = await createCustomerAndRelationship({
    vendorId,
    customer: toColumnPayload(payload.customer, CUSTOMER_CREATE_FIELDS),
    relationship: toColumnPayload(payload.relationship || {}, RELATIONSHIP_FIELDS)
  });

  if (result.relationshipAlreadyExists) {
    throw new AppError("This customer is already linked to the current vendor", {
      statusCode: 409,
      code: "CUSTOMER_RELATIONSHIP_ALREADY_EXISTS",
      details: [
        {
          path: "customer",
          message: "A matching customer master record already has a relationship for this vendor"
        }
      ]
    });
  }

  const row = await findCustomerForVendor(vendorId, result.customer.id);

  return {
    ...mapCustomerWithRelationship(row),
    reusedCustomer: result.reusedCustomer
  };
}

async function updateCustomerForCurrentVendor(vendorId, customerId, payload) {
  const existing = await findCustomerForVendor(vendorId, customerId);

  assertCustomerFound(existing, customerId);

  const row = await updateCustomerForVendor({
    vendorId,
    customerId,
    customerUpdates: toColumnPayload(payload.customer || {}, CUSTOMER_UPDATE_FIELDS),
    relationshipUpdates: toColumnPayload(payload.relationship || {}, RELATIONSHIP_FIELDS)
  });

  assertCustomerFound(row, customerId);

  return mapCustomerWithRelationship(row);
}

export {
  createCustomerForVendor,
  getCustomerDetail,
  getCustomerDirectory,
  updateCustomerForCurrentVendor
};
