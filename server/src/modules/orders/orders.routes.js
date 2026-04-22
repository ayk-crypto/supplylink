import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import requireVendorWritable from "../../middlewares/requireVendorWritable.js";
import validateRequest from "../../middlewares/validateRequest.js";
import {
  cancel,
  confirm,
  create,
  createInvoiceFromOrder,
  deliver,
  dispatch,
  getById,
  list,
  pack,
  update
} from "./orders.controller.js";
import {
  orderCreateBodySchema,
  orderIdParamsSchema,
  orderQuerySchema,
  orderUpdateBodySchema
} from "./orders.schemas.js";
import { emptyBodySchema } from "../../core/http/emptySchema.js";

const ordersRoutes = Router();

ordersRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: orderQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

ordersRoutes.post(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({ query: orderQuerySchema, body: orderCreateBodySchema }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(create)
);

function orderAction(handler) {
  return [
    authenticate,
    authorizeRoles("super_admin", "vendor_admin"),
    validateRequest({
      params: orderIdParamsSchema,
      query: orderQuerySchema,
      body: emptyBodySchema
    }),
    requireVendorAccess(),
    requireVendorWritable(),
    asyncHandler(handler)
  ];
}

ordersRoutes.post("/:orderId/confirm", ...orderAction(confirm));
ordersRoutes.post("/:orderId/pack", ...orderAction(pack));
ordersRoutes.post("/:orderId/dispatch", ...orderAction(dispatch));
ordersRoutes.post("/:orderId/deliver", ...orderAction(deliver));
ordersRoutes.post("/:orderId/cancel", ...orderAction(cancel));
ordersRoutes.post("/:orderId/create-invoice", ...orderAction(createInvoiceFromOrder));

ordersRoutes.get(
  "/:orderId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: orderIdParamsSchema, query: orderQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getById)
);

ordersRoutes.patch(
  "/:orderId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin"),
  validateRequest({
    params: orderIdParamsSchema,
    query: orderQuerySchema,
    body: orderUpdateBodySchema
  }),
  requireVendorAccess(),
  requireVendorWritable(),
  asyncHandler(update)
);

export default ordersRoutes;
