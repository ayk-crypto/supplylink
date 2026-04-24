import { z } from "zod";
import {
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_STATUSES
} from "./subscriptionPlans.js";

const uuidParam = z.string().uuid();
const subscriptionPlanEnum = z.enum(SUBSCRIPTION_PLAN_CODES);
const subscriptionStatusEnum = z.enum(SUBSCRIPTION_STATUSES);

const vendorIdParamsSchema = z.object({
  vendorId: uuidParam
});

const subscriptionUpgradeBodySchema = z.object({
  plan: z.enum(["basic", "pro"])
});

const extendTrialBodySchema = z.object({
  vendorId: uuidParam,
  days: z.coerce.number().int().min(1).max(365)
});

export {
  extendTrialBodySchema,
  subscriptionPlanEnum,
  subscriptionStatusEnum,
  subscriptionUpgradeBodySchema,
  vendorIdParamsSchema
};
