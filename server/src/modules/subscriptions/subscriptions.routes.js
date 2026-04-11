import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  create,
  getById,
  getMe,
  getVendorOverview,
  list,
  update,
  updateVendorStatus
} from "./subscriptions.controller.js";
import {
  subscriptionCreateBodySchema,
  subscriptionIdParamsSchema,
  subscriptionQuerySchema,
  subscriptionUpdateBodySchema,
  vendorIdParamsSchema,
  vendorStatusUpdateBodySchema
} from "./subscriptions.schemas.js";

const subscriptionsRoutes = Router();

subscriptionsRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ query: subscriptionQuerySchema }),
  asyncHandler(list)
);

subscriptionsRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ body: subscriptionCreateBodySchema }),
  asyncHandler(create)
);

subscriptionsRoutes.get(
  "/me",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  requireVendorAccess(),
  asyncHandler(getMe)
);

subscriptionsRoutes.get(
  "/admin/vendors/:vendorId/overview",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ params: vendorIdParamsSchema }),
  asyncHandler(getVendorOverview)
);

subscriptionsRoutes.patch(
  "/admin/vendors/:vendorId/status",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ params: vendorIdParamsSchema, body: vendorStatusUpdateBodySchema }),
  asyncHandler(updateVendorStatus)
);

subscriptionsRoutes.get(
  "/:subscriptionId",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({ params: subscriptionIdParamsSchema }),
  asyncHandler(getById)
);

subscriptionsRoutes.patch(
  "/:subscriptionId",
  authenticate,
  authorizeRoles("super_admin"),
  validateRequest({
    params: subscriptionIdParamsSchema,
    body: subscriptionUpdateBodySchema
  }),
  asyncHandler(update)
);

export default subscriptionsRoutes;
