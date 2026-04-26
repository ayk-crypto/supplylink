import AppError from "../../core/errors/AppError.js";
import { registerUser } from "../auth/auth.service.js";
import {
  findVendorById,
  findVendorBySlug,
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

  const hasSubscriptionSummary =
    Object.prototype.hasOwnProperty.call(vendor, "subscription_plan") ||
    Object.prototype.hasOwnProperty.call(vendor, "subscription_status");

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
    ...(hasSubscriptionSummary
      ? {
          plan: vendor.subscription_plan || "free",
          subscriptionStatus: vendor.subscription_status || "trial"
        }
      : {}),
    adminUser: vendor.admin_user_id
      ? {
          id: vendor.admin_user_id,
          fullName: vendor.admin_full_name,
          email: vendor.admin_email
        }
      : null,
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

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

async function buildUniqueVendorSlug(vendorName) {
  const baseSlug = slugify(vendorName);

  if (!baseSlug) {
    throw new AppError("Vendor slug could not be generated", {
      statusCode: 422,
      code: "VENDOR_SLUG_REQUIRED",
      details: [
        {
          path: "vendorName",
          message: "Use a vendor name with letters or numbers"
        }
      ]
    });
  }

  let candidate = baseSlug;
  let suffix = 2;

  while (await findVendorBySlug(candidate)) {
    const suffixText = `-${suffix}`;
    candidate = `${baseSlug.slice(0, 160 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

async function getVendorProfile(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  return mapVendor(vendor);
}

async function createVendorAccount(payload, actor) {
  const slug = await buildUniqueVendorSlug(payload.vendorName);
  const result = await registerUser(
    {
      fullName: payload.adminName,
      email: payload.adminEmail,
      password: payload.temporaryPassword,
      roleCode: "vendor_admin",
      vendor: {
        legalName: payload.vendorName,
        displayName: payload.vendorName,
        slug,
        contactEmail: payload.adminEmail
      },
      jobTitle: "Vendor admin"
    },
    actor
  );

  return {
    vendor: {
      id: result.vendor.id,
      legalName: result.vendor.legalName,
      displayName: result.vendor.displayName,
      slug: result.vendor.slug,
      status: "active",
      plan: "free"
    },
    adminUser: {
      id: result.user.id,
      fullName: result.user.fullName,
      email: result.user.email,
      roles: result.user.roleCodes
    }
  };
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
  createVendorAccount,
  getAccessibleVendorProfile,
  getVendorDirectory,
  getVendorMembers,
  updateAccessibleVendorProfile
};
