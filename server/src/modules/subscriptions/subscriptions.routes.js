import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  cancel,
  extendTrial,
  getMe,
  upgrade
} from "./subscriptions.controller.js";
import {
  extendTrialBodySchema,
  subscriptionUpgradeBodySchema,
} from "./subscriptions.schemas.js";

const subscriptionsRoutes = Router();

subscriptionsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  requireVendorAccess(),
  asyncHandler(getMe)
);

subscriptionsRoutes.post(
  "/upgrade",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ body: subscriptionUpgradeBodySchema }),
  requireVendorAccess(),
  asyncHandler(upgrade)
);

subscriptionsRoutes.post(
  "/cancel",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  requireVendorAccess(),
  asyncHandler(cancel)
);

subscriptionsRoutes.post(
  "/extend-trial",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ body: extendTrialBodySchema }),
  asyncHandler(extendTrial)
);

export default subscriptionsRoutes;
