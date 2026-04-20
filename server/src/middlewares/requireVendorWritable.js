import { query } from "../config/db.js";
import AppError from "../core/errors/AppError.js";

const BLOCKED_WRITE_STATUSES = ["suspended", "archived"];

async function findVendorStatus(vendorId) {
  const result = await query(
    `SELECT id, status
     FROM vendors
     WHERE id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

function requireVendorWritable(options = {}) {
  const statusLookup = options.findVendorStatus || findVendorStatus;

  return async (request, response, next) => {
    void response;

    if (request.auth?.isSuperAdmin) {
      return next();
    }

    const vendorId = request.access?.vendorId;

    if (!vendorId) {
      return next(
        new AppError("Vendor access context is required before write policy checks", {
          statusCode: 500,
          code: "VENDOR_ACCESS_CONTEXT_MISSING"
        })
      );
    }

    try {
      const vendor = await statusLookup(vendorId);

      if (!vendor) {
        return next(
          new AppError("Vendor not found", {
            statusCode: 404,
            code: "VENDOR_NOT_FOUND"
          })
        );
      }

      if (BLOCKED_WRITE_STATUSES.includes(vendor.status)) {
        return next(
          new AppError("Vendor account is not allowed to perform this write operation", {
            statusCode: 403,
            code: "VENDOR_WRITE_BLOCKED",
            details: [
              {
                path: "vendorId",
                message: `Vendor account status is ${vendor.status}`
              }
            ]
          })
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export { BLOCKED_WRITE_STATUSES };
export default requireVendorWritable;
