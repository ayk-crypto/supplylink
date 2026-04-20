import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const subscriptionStatusEnum = z.enum(["trialing", "active", "past_due", "cancelled", "expired"]);
const billingCycleEnum = z.enum(["monthly", "quarterly", "yearly"]);
const vendorStatusEnum = z.enum(["draft", "active", "suspended", "archived"]);

const subscriptionIdParamsSchema = z.object({
  subscriptionId: uuidParam
});

const vendorIdParamsSchema = z.object({
  vendorId: uuidParam
});

const subscriptionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    vendorId: uuidParam.optional(),
    status: subscriptionStatusEnum.optional(),
    planCode: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    periodStartFrom: z.string().trim().date().optional(),
    periodStartTo: z.string().trim().date().optional(),
    periodEndFrom: z.string().trim().date().optional(),
    periodEndTo: z.string().trim().date().optional()
  })
  .refine(
    (value) =>
      !value.periodStartFrom ||
      !value.periodStartTo ||
      value.periodStartFrom <= value.periodStartTo,
    {
      message: "periodStartFrom must be before or equal to periodStartTo",
      path: ["periodStartFrom"]
    }
  )
  .refine(
    (value) =>
      !value.periodEndFrom ||
      !value.periodEndTo ||
      value.periodEndFrom <= value.periodEndTo,
    {
      message: "periodEndFrom must be before or equal to periodEndTo",
      path: ["periodEndFrom"]
    }
  );

const subscriptionCreateBodySchema = z.object({
  vendorId: uuidParam,
  planCode: z.string().trim().min(1).max(100),
  status: subscriptionStatusEnum.optional(),
  startsAt: z.string().trim().date().nullable().optional(),
  endsAt: z.string().trim().date().nullable().optional(),
  currentPeriodStart: z.string().trim().date().nullable().optional(),
  currentPeriodEnd: z.string().trim().date().nullable().optional(),
  trialEndsAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
  billingCycle: billingCycleEnum.optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  metadata: jsonRecordSchema.optional()
});

const subscriptionUpdateBodySchema = z
  .object({
    planCode: z.string().trim().min(1).max(100).optional(),
    status: subscriptionStatusEnum.optional(),
    startsAt: z.string().trim().date().nullable().optional(),
    endsAt: z.string().trim().date().nullable().optional(),
    currentPeriodStart: z.string().trim().date().nullable().optional(),
    currentPeriodEnd: z.string().trim().date().nullable().optional(),
    trialEndsAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
    billingCycle: billingCycleEnum.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

const vendorStatusUpdateBodySchema = z.object({
  status: vendorStatusEnum,
  reason: z.string().trim().max(5000).optional()
});

export {
  subscriptionCreateBodySchema,
  subscriptionIdParamsSchema,
  subscriptionQuerySchema,
  subscriptionStatusEnum,
  subscriptionUpdateBodySchema,
  vendorIdParamsSchema,
  vendorStatusUpdateBodySchema
};
