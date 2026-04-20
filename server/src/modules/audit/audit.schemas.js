import { z } from "zod";

const uuidParam = z.string().uuid();

const auditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    entityType: z.string().trim().min(1).max(100).optional(),
    entityId: uuidParam.optional(),
    eventType: z.string().trim().min(1).max(120).optional(),
    dateFrom: z.string().trim().date().optional(),
    dateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: "dateFrom must be before or equal to dateTo",
    path: ["dateFrom"]
  });

const auditEntityParamsSchema = z.object({
  entityType: z.string().trim().min(1).max(100),
  entityId: uuidParam
});

export { auditEntityParamsSchema, auditQuerySchema };
