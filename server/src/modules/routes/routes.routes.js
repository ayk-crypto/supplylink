import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { create, createStop, getById, list, listStops, update, updateStop } from "./routes.controller.js";
import {
  routeCreateBodySchema,
  routeIdParamsSchema,
  routeQuerySchema,
  routeStopCreateBodySchema,
  routeStopParamsSchema,
  routeStopUpdateBodySchema,
  routeUpdateBodySchema
} from "./routes.schemas.js";

const routesRoutes = Router();

routesRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: routeQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

routesRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: routeQuerySchema, body: routeCreateBodySchema }),
  requireVendorAccess(),
  asyncHandler(create)
);

routesRoutes.get(
  "/:routeId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: routeIdParamsSchema, query: routeQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

routesRoutes.patch(
  "/:routeId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeIdParamsSchema,
    query: routeQuerySchema,
    body: routeUpdateBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(update)
);

routesRoutes.get(
  "/:routeId/stops",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: routeIdParamsSchema, query: routeQuerySchema }),
  requireVendorAccess(),
  asyncHandler(listStops)
);

routesRoutes.post(
  "/:routeId/stops",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeIdParamsSchema,
    query: routeQuerySchema,
    body: routeStopCreateBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(createStop)
);

routesRoutes.patch(
  "/:routeId/stops/:stopId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: routeStopParamsSchema,
    query: routeQuerySchema,
    body: routeStopUpdateBodySchema
  }),
  requireVendorAccess(),
  asyncHandler(updateStop)
);

export default routesRoutes;
