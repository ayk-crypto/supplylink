import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import {
  adminBillingQuerySchema,
  adminBillingPaymentsQuerySchema,
  adminPaymentCreateBodySchema,
  adminPlanUpdateBodySchema,
  adminSubscriptionUpdateBodySchema,
  planCodeParamsSchema,
  vendorIdParamsSchema
} from "../subscriptions/subscriptions.schemas.js";
import {
  createPayment,
  listPayments,
  listPlans,
  listSubscriptions,
  updatePlan,
  updateSubscription
} from "./adminBilling.controller.js";

const adminBillingRoutes = Router();

adminBillingRoutes.use(authenticate, authorizeRoles("super_admin"));

adminBillingRoutes.get("/plans", asyncHandler(listPlans));

adminBillingRoutes.get(
  "/payments",
  validateRequest({ query: adminBillingPaymentsQuerySchema }),
  asyncHandler(listPayments)
);

adminBillingRoutes.post(
  "/payments",
  validateRequest({ body: adminPaymentCreateBodySchema }),
  asyncHandler(createPayment)
);

adminBillingRoutes.patch(
  "/plans/:planCode",
  validateRequest({ params: planCodeParamsSchema, body: adminPlanUpdateBodySchema }),
  asyncHandler(updatePlan)
);

adminBillingRoutes.get(
  "/subscriptions",
  validateRequest({ query: adminBillingQuerySchema }),
  asyncHandler(listSubscriptions)
);

adminBillingRoutes.patch(
  "/subscriptions/:vendorId",
  validateRequest({ params: vendorIdParamsSchema, body: adminSubscriptionUpdateBodySchema }),
  asyncHandler(updateSubscription)
);

export default adminBillingRoutes;
