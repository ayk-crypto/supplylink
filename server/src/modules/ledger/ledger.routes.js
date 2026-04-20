import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { getCustomerStatement, list } from "./ledger.controller.js";
import {
  customerLedgerParamsSchema,
  ledgerQuerySchema
} from "./ledger.schemas.js";

const ledgerRoutes = Router();

ledgerRoutes.get(
  "/",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ query: ledgerQuerySchema }),
  requireVendorAccess(),
  asyncHandler(list)
);

ledgerRoutes.get(
  "/customer/:customerId",
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff"),
  validateRequest({ params: customerLedgerParamsSchema, query: ledgerQuerySchema }),
  requireVendorAccess(),
  asyncHandler(getCustomerStatement)
);

export default ledgerRoutes;
