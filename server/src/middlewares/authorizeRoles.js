import AppError from "../core/errors/AppError.js";

function authorizeRoles(...allowedRoles) {
  return (request, response, next) => {
    void response;

    const userRoles = request.auth?.roleCodes || [];

    if (!userRoles.some((roleCode) => allowedRoles.includes(roleCode))) {
      return next(
        new AppError("You do not have permission to perform this action", {
          statusCode: 403,
          code: "FORBIDDEN"
        })
      );
    }

    return next();
  };
}

export default authorizeRoles;
