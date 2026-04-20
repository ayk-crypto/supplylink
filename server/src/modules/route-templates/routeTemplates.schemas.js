import { z } from "zod";

const uuidParam = z.string().uuid();
const routeStatusEnum = z.enum(["draft", "planned"]);
const recurrenceTypeEnum = z.enum(["weekly"]);
const weekdaySchema = z.coerce.number().int().min(0).max(6);
const booleanQuerySchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const recurrenceDaysSchema = z
  .array(weekdaySchema)
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length, {
    message: "recurrenceDays cannot contain duplicate weekdays"
  })
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

const routeTemplateIdParamsSchema = z.object({
  templateId: uuidParam
});

const routeTemplateStopParamsSchema = z.object({
  templateId: uuidParam,
  stopId: uuidParam
});

const routeTemplateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  isActive: booleanQuerySchema.optional(),
  vendorId: uuidParam.optional()
});

const routeTemplateCreateBodySchema = z.object({
  name: z.string().trim().min(2).max(150),
  notes: z.string().trim().max(5000).nullable().optional(),
  vehicleLabel: z.string().trim().min(1).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  recurrenceType: recurrenceTypeEnum.optional(),
  recurrenceDays: recurrenceDaysSchema
});

const routeTemplateUpdateBodySchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    vehicleLabel: z.string().trim().min(1).max(100).nullable().optional(),
    isActive: z.boolean().optional(),
    recurrenceType: recurrenceTypeEnum.optional(),
    recurrenceDays: recurrenceDaysSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

const routeTemplateStopCreateBodySchema = z.object({
  customerId: uuidParam,
  sequenceNumber: z.coerce.number().int().min(1),
  notes: z.string().trim().max(5000).nullable().optional()
});

const routeTemplateStopUpdateBodySchema = z
  .object({
    customerId: uuidParam.optional(),
    sequenceNumber: z.coerce.number().int().min(1).optional(),
    notes: z.string().trim().max(5000).nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

const routeTemplateGenerateBodySchema = z.object({
  routeDate: z.string().trim().date(),
  name: z.string().trim().min(2).max(150).optional(),
  vehicleLabel: z.string().trim().min(1).max(100).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  status: routeStatusEnum.optional()
});

export {
  routeTemplateCreateBodySchema,
  routeTemplateGenerateBodySchema,
  routeTemplateIdParamsSchema,
  routeTemplateQuerySchema,
  routeTemplateStopCreateBodySchema,
  routeTemplateStopParamsSchema,
  routeTemplateStopUpdateBodySchema,
  routeTemplateUpdateBodySchema
};
