import { z } from "zod";
import {
  BILLING_CYCLES,
  SUBSCRIPTION_PLAN_CODES,
  SUBSCRIPTION_STATUSES
} from "./subscriptionPlans.js";

const uuidParam = z.string().uuid();
const subscriptionPlanEnum = z.enum(SUBSCRIPTION_PLAN_CODES);
const subscriptionStatusEnum = z.enum(SUBSCRIPTION_STATUSES);
const billingCycleEnum = z.enum(BILLING_CYCLES);

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

const adminBillingQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  status: subscriptionStatusEnum.optional().or(z.literal("")).default(""),
  plan: subscriptionPlanEnum.optional().or(z.literal("")).default(""),
  billingCycle: billingCycleEnum.optional().or(z.literal("")).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const planCodeParamsSchema = z.object({
  planCode: subscriptionPlanEnum
});

const nullableLimit = z.union([z.coerce.number().int().min(0), z.null()]);
const nullableDate = z.union([z.string().datetime({ offset: true }), z.null()]);

const adminPlanUpdateBodySchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  annualPrice: z.coerce.number().min(0).optional(),
  annualFreeMonths: z.coerce.number().int().min(0).max(24).optional(),
  maxCustomers: nullableLimit.optional(),
  maxInvoicesPerMonth: nullableLimit.optional(),
  isActive: z.boolean().optional()
});

const adminSubscriptionUpdateBodySchema = z.object({
  plan: subscriptionPlanEnum.optional(),
  status: subscriptionStatusEnum.optional(),
  billingCycle: billingCycleEnum.optional(),
  currentPeriodStart: nullableDate.optional(),
  currentPeriodEnd: nullableDate.optional(),
  expiresAt: nullableDate.optional(),
  trialEndsAt: nullableDate.optional(),
  extendTrialDays: z.coerce.number().int().min(1).max(365).optional(),
  adminNotes: z.union([z.string().trim().max(2000), z.null()]).optional()
});

const paymentMethodEnum = z.enum([
  "bank_transfer",
  "cash",
  "card_manual",
  "easypaisa",
  "jazzcash",
  "other"
]);
const paymentStatusEnum = z.enum(["received", "pending", "failed", "refunded"]);

const adminBillingPaymentsQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  status: paymentStatusEnum.optional().or(z.literal("")).default(""),
  vendorId: uuidParam.optional().or(z.literal("")).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const adminPaymentCreateBodySchema = z.object({
  vendorId: uuidParam,
  planCode: subscriptionPlanEnum,
  billingCycle: billingCycleEnum,
  amount: z.coerce.number().min(0),
  currency: z.string().trim().min(3).max(10).default("USD"),
  paymentMethod: paymentMethodEnum,
  paymentReference: z.union([z.string().trim().max(160), z.null()]).optional(),
  paymentStatus: paymentStatusEnum.default("received"),
  paidAt: z.string().datetime({ offset: true }).optional().nullable(),
  notes: z.union([z.string().trim().max(2000), z.null()]).optional()
});

export {
  adminBillingQuerySchema,
  adminBillingPaymentsQuerySchema,
  adminPaymentCreateBodySchema,
  adminPlanUpdateBodySchema,
  adminSubscriptionUpdateBodySchema,
  billingCycleEnum,
  extendTrialBodySchema,
  planCodeParamsSchema,
  subscriptionPlanEnum,
  subscriptionStatusEnum,
  subscriptionUpgradeBodySchema,
  vendorIdParamsSchema
};
