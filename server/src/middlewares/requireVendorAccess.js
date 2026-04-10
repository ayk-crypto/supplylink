import AppError from "../core/errors/AppError.js";

function resolveVendorId(request, options = {}) {
  return (
    request.params?.vendorId ||
    request.query?.vendorId ||
    request.body?.vendorId ||
    request.tenant?.vendorId ||
    request.auth?.currentVendorId ||
    options.vendorId ||
    null
  );
}

function requireVendorAccess(options = {}) {
  return (request, response, next) => {
    void response;

    const vendorId = resolveVendorId(request, options);

    if (!vendorId) {
      return next(
        new AppError("Vendor context is required", {
          statusCode: 400,
          code: "VENDOR_CONTEXT_REQUIRED"
        })
      );
    }

    if (request.auth?.isSuperAdmin) {
      request.access = {
        ...(request.access || {}),
        vendorId
      };

      return next();
    }

    const hasMembership = (request.auth?.memberships || []).some(
      (membership) => membership.vendorId === vendorId && membership.status === "active"
    );

    if (!hasMembership) {
      return next(
        new AppError("You do not have access to this vendor", {
          statusCode: 403,
          code: "VENDOR_ACCESS_DENIED"
        })
      );
    }

    request.access = {
      ...(request.access || {}),
      vendorId
    };

    return next();
  };
}

export default requireVendorAccess;
