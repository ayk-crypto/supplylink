import { z } from "zod";

const uuidParam = z.string().uuid();
const booleanQuerySchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return value;
}, z.boolean());

const notificationIdParamsSchema = z.object({
  notificationId: uuidParam
});

const notificationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    unreadOnly: booleanQuerySchema.optional(),
    type: z.string().trim().min(1).max(50).optional(),
    eventCode: z.string().trim().min(1).max(100).optional(),
    dateFrom: z.string().trim().date().optional(),
    dateTo: z.string().trim().date().optional()
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: "dateFrom must be before or equal to dateTo",
    path: ["dateFrom"]
  });

export { notificationIdParamsSchema, notificationQuerySchema };
