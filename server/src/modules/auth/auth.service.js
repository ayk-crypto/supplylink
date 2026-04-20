import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import AppError from "../../core/errors/AppError.js";
import { AUTH_FOUNDATION_ROLES } from "../../core/constants/roles.js";
import {
  countUsersByRoleCode,
  createUserWithRole,
  createVendor,
  findUserByEmail,
  findUserById,
  findVendorById,
  getRoleByCode,
  getUserRoles,
  getVendorMemberships,
  touchLastLogin
} from "./auth.repository.js";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function sanitizeUser(user, roles = [], memberships = []) {
  const roleCodes = roles.map((role) => role.code);

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    roleCodes,
    roles,
    memberships
  };
}

function resolveCurrentVendorId(memberships, preferredVendorId = null) {
  if (preferredVendorId) {
    return preferredVendorId;
  }

  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  if (activeMemberships.length === 1) {
    return activeMemberships[0].vendorId;
  }

  return null;
}

async function getAuthProfile(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User not found", {
      statusCode: 404,
      code: "USER_NOT_FOUND"
    });
  }

  const [roles, memberships] = await Promise.all([
    getUserRoles(userId),
    getVendorMemberships(userId)
  ]);

  return sanitizeUser(user, roles, memberships);
}

async function buildAuthContext(userId, options = {}) {
  const user = await getAuthProfile(userId);

  return {
    userId: user.id,
    user,
    roleCodes: user.roleCodes,
    memberships: user.memberships,
    isSuperAdmin: user.roleCodes.includes("super_admin"),
    currentVendorId: resolveCurrentVendorId(user.memberships, options.currentVendorId)
  };
}

function signAccessToken(user) {
  if (!env.JWT_SECRET) {
    throw new AppError("JWT secret is not configured", {
      statusCode: 500,
      code: "JWT_NOT_CONFIGURED"
    });
  }

  const currentVendorId = resolveCurrentVendorId(user.memberships);

  return jwt.sign(
    {
      sub: user.id,
      roleCodes: user.roleCodes,
      vendorIds: user.memberships.map((membership) => membership.vendorId),
      currentVendorId
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );
}

async function assertRoleRegistrationAllowed(roleCode, actor, options = {}) {
  if (!AUTH_FOUNDATION_ROLES.includes(roleCode)) {
    throw new AppError("Unsupported role selected", {
      statusCode: 422,
      code: "UNSUPPORTED_ROLE"
    });
  }

  if (roleCode === "super_admin") {
    const superAdminCount = await countUsersByRoleCode("super_admin");

    if (superAdminCount === 0) {
      return;
    }

    if (!actor?.isSuperAdmin) {
      throw new AppError("Only a super admin can create another super admin", {
        statusCode: 403,
        code: "SUPER_ADMIN_REQUIRED"
      });
    }

    return;
  }

  if (!actor) {
    if (roleCode === "vendor_admin") {
      if (!options.isNewVendorRegistration) {
        throw new AppError("Public vendor admin registration must create a new vendor", {
          statusCode: 403,
          code: "VENDOR_BOOTSTRAP_REQUIRED"
        });
      }

      return;
    }

    throw new AppError("Authentication is required to create this role", {
      statusCode: 401,
      code: "AUTHENTICATION_REQUIRED"
    });
  }

  if (actor.isSuperAdmin) {
    return;
  }

  if (roleCode === "vendor_staff" && actor.roleCodes.includes("vendor_admin")) {
    const actorHasVendorAccess = actor.memberships.some(
      (membership) => membership.vendorId === options.vendorId && membership.status === "active"
    );

    if (actorHasVendorAccess) {
      return;
    }
  }

  if (roleCode === "customer_user" && actor.roleCodes.includes("vendor_admin")) {
    return;
  }

  throw new AppError("You do not have permission to register this user", {
    statusCode: 403,
    code: "REGISTRATION_NOT_ALLOWED"
  });
}

async function resolveVendorForRegistration(payload, actor) {
  if (!["vendor_admin", "vendor_staff"].includes(payload.roleCode)) {
    return null;
  }

  if (payload.vendorId) {
    const vendor = await findVendorById(payload.vendorId);

    if (!vendor) {
      throw new AppError("Vendor not found", {
        statusCode: 404,
        code: "VENDOR_NOT_FOUND"
      });
    }

    return vendor;
  }

  if (!payload.vendor) {
    return null;
  }

  if (payload.roleCode !== "vendor_admin") {
    throw new AppError("Only vendor admin registration can create a new vendor", {
      statusCode: 422,
      code: "INVALID_VENDOR_REGISTRATION"
    });
  }

  if (actor && !actor.isSuperAdmin) {
    throw new AppError("Only unauthenticated bootstrap or super admin can create a new vendor here", {
      statusCode: 403,
      code: "VENDOR_CREATION_NOT_ALLOWED"
    });
  }

  return createVendor({
    legalName: payload.vendor.legalName,
    displayName: payload.vendor.displayName,
    slug: payload.vendor.slug,
    contactEmail: payload.vendor.contactEmail || payload.email
  });
}

async function registerUser(payload, actor = null) {
  const email = normalizeEmail(payload.email);
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError("A user with this email already exists", {
      statusCode: 409,
      code: "EMAIL_ALREADY_IN_USE"
    });
  }

  const vendor = await resolveVendorForRegistration(payload, actor);
  await assertRoleRegistrationAllowed(payload.roleCode, actor, {
    vendorId: vendor?.id || payload.vendorId || null,
    isNewVendorRegistration: Boolean(payload.vendor)
  });

  if (payload.roleCode === "vendor_staff" && !vendor) {
    throw new AppError("Vendor staff users must be assigned to a vendor", {
      statusCode: 422,
      code: "VENDOR_REQUIRED"
    });
  }

  const role = await getRoleByCode(payload.roleCode);

  if (!role) {
    throw new AppError("Role is not configured in the database", {
      statusCode: 500,
      code: "ROLE_NOT_CONFIGURED"
    });
  }

  const passwordHash = await bcrypt.hash(payload.password, env.BCRYPT_SALT_ROUNDS);
  const vendorId = vendor?.id || payload.vendorId || null;
  const shouldCreateMembership = ["vendor_admin", "vendor_staff"].includes(payload.roleCode);

  const createdUser = await createUserWithRole({
    user: {
      fullName: payload.fullName,
      email,
      passwordHash,
      phone: payload.phone || null,
      status: "active"
    },
    roleId: role.id,
    vendorId,
    membership: shouldCreateMembership
      ? {
          vendorId,
          status: "active",
          jobTitle: payload.jobTitle || null,
          invitedByUserId: actor?.userId || null,
          joinedAt: new Date().toISOString()
        }
      : null
  });

  const userProfile = await getAuthProfile(createdUser.id);
  const accessToken = signAccessToken(userProfile);

  return {
    accessToken,
    user: userProfile,
    vendor: vendor
      ? {
          id: vendor.id,
          displayName: vendor.display_name,
          legalName: vendor.legal_name,
          slug: vendor.slug
        }
      : null
  };
}

async function loginUser(payload) {
  const email = normalizeEmail(payload.email);
  const user = await findUserByEmail(email);

  if (!user?.password_hash) {
    throw new AppError("Invalid email or password", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    });
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", {
      statusCode: 401,
      code: "INVALID_CREDENTIALS"
    });
  }

  if (user.status !== "active") {
    throw new AppError("This account is not active", {
      statusCode: 403,
      code: "ACCOUNT_NOT_ACTIVE"
    });
  }

  const profile = await getAuthProfile(user.id);

  if (payload.vendorId && !profile.roleCodes.includes("super_admin")) {
    const hasVendorAccess = profile.memberships.some(
      (membership) => membership.vendorId === payload.vendorId && membership.status === "active"
    );

    if (!hasVendorAccess) {
      throw new AppError("You do not have access to the requested vendor", {
        statusCode: 403,
        code: "VENDOR_ACCESS_DENIED"
      });
    }
  }

  await touchLastLogin(user.id);
  const refreshedProfile = await getAuthProfile(user.id);

  if (!env.JWT_SECRET) {
    throw new AppError("JWT secret is not configured", {
      statusCode: 500,
      code: "JWT_NOT_CONFIGURED"
    });
  }

  const currentVendorId = resolveCurrentVendorId(refreshedProfile.memberships, payload.vendorId);

  const accessToken = jwt.sign(
    {
      sub: refreshedProfile.id,
      roleCodes: refreshedProfile.roleCodes,
      vendorIds: refreshedProfile.memberships.map((membership) => membership.vendorId),
      currentVendorId
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN
    }
  );

  return {
    accessToken,
    user: {
      ...refreshedProfile,
      currentVendorId
    }
  };
}

async function getCurrentUserProfile(userId) {
  const profile = await getAuthProfile(userId);

  return {
    ...profile,
    currentVendorId: resolveCurrentVendorId(profile.memberships)
  };
}

export { buildAuthContext, getCurrentUserProfile, loginUser, registerUser };
