import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { createContext, dashboard, notificationsPanel } from "./ui.controller.js";
import { uiContextQuerySchema, uiPanelQuerySchema, uiVendorQuerySchema } from "./ui.schemas.js";

const uiRoutes = Router();
const vendorUiAccess = [
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff")
];

uiRoutes.get(
  "/dashboard",
  ...vendorUiAccess,
  validateRequest({ query: uiVendorQuerySchema }),
  requireVendorAccess(),
  asyncHandler(dashboard)
);

uiRoutes.get(
  "/create-context",
  ...vendorUiAccess,
  validateRequest({ query: uiContextQuerySchema }),
  requireVendorAccess(),
  asyncHandler(createContext)
);

uiRoutes.get(
  "/notifications-panel",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: uiPanelQuerySchema }),
  asyncHandler(notificationsPanel)
);

export default uiRoutes;
