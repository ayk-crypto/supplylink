import AppError from "../../core/errors/AppError.js";
import {
  findVendorById,
  listVendorMembers,
  listVendors,
  updateVendorById
} from "./vendors.repository.js";

const VENDOR_ADMIN_UPDATE_FIELDS = {
  legalName: "legal_name",
  displayName: "display_name",
  contactEmail: "contact_email",
  contactPhone: "contact_phone",
  currencyCode: "currency_code",
  timezone: "timezone"
};

const SUPER_ADMIN_UPDATE_FIELDS = {
  ...VENDOR_ADMIN_UPDATE_FIELDS,
  slug: "slug",
  status: "status"
};

function mapVendor(vendor) {
  if (!vendor) {
    return null;
  }

  return {
    id: vendor.id,
    legalName: vendor.legal_name,
    displayName: vendor.display_name,
    slug: vendor.slug,
    status: vendor.status,
    contactEmail: vendor.contact_email,
    contactPhone: vendor.contact_phone,
    currencyCode: vendor.currency_code,
    timezone: vendor.timezone,
    createdAt: vendor.created_at,
    updatedAt: vendor.updated_at
  };
}

function mapMember(member) {
  return {
    userId: member.user_id,
    fullName: member.full_name,
    email: member.email,
    roles: member.role_codes || [],
    membershipStatus: member.membership_status,
    joinedAt: member.joined_at || member.created_at
  };
}

function assertVendorFound(vendor, vendorId) {
  if (!vendor) {
    throw new AppError("Vendor not found", {
      statusCode: 404,
      code: "VENDOR_NOT_FOUND",
      details: vendorId
        ? [
            {
              path: "vendorId",
              message: `No vendor was found for ${vendorId}`
            }
          ]
        : []
    });
  }
}

function buildVendorUpdatePayload(input, fieldMap) {
  const updates = {};

  Object.entries(fieldMap).forEach(([inputKey, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      updates[column] = input[inputKey];
    }
  });

  return updates;
}

async function getVendorProfile(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  return mapVendor(vendor);
}

async function getAccessibleVendorProfile(vendorId) {
  return getVendorProfile(vendorId);
}

async function updateAccessibleVendorProfile(vendorId, payload, actor) {
  const fieldMap = actor.isSuperAdmin ? SUPER_ADMIN_UPDATE_FIELDS : VENDOR_ADMIN_UPDATE_FIELDS;
  const updates = buildVendorUpdatePayload(payload, fieldMap);
  const vendor = await updateVendorById(vendorId, updates);

  assertVendorFound(vendor, vendorId);

  return mapVendor(vendor);
}

async function getVendorDirectory(query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const result = await listVendors({
    search: query.search || null,
    status: query.status || null,
    limit: pageSize,
    offset
  });

  return {
    items: result.rows.map(mapVendor),
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

async function getVendorMembers(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  const members = await listVendorMembers(vendorId);

  return {
    vendor: mapVendor(vendor),
    items: members.map(mapMember)
  };
}

export {
  getAccessibleVendorProfile,
  getVendorDirectory,
  getVendorMembers,
  updateAccessibleVendorProfile
};
