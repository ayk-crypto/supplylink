import { assertSubscriptionAccess } from "../modules/subscriptions/subscriptions.service.js";

function requireSubscriptionAccess(actionType) {
  return async (request, response, next) => {
    void response;

    try {
      if (request.auth?.isSuperAdmin) {
        return next();
      }

      await assertSubscriptionAccess(request.access.vendorId, actionType);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export default requireSubscriptionAccess;
