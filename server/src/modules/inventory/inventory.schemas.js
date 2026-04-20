import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const movementTypeSchema = z.enum(["inbound", "outbound", "adjustment"]);
const productStatusEnum = z.enum(["draft", "active", "archived"]);

const inventoryProductIdParamsSchema = z.object({
  productId: uuidParam
});

const inventoryProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: productStatusEnum.optional(),
  categoryId: uuidParam.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  vendorId: uuidParam.optional()
});

const stockMovementQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    productId: uuidParam.optional(),
    type: movementTypeSchema.optional(),
    referenceType: z.string().trim().min(1).max(50).optional(),
    referenceId: uuidParam.optional(),
    dateFrom: z.string().trim().date().optional(),
    dateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    message: "dateFrom must be before or equal to dateTo",
    path: ["dateFrom"]
  });

const inventoryAdjustBodySchema = z.object({
  productId: uuidParam,
  type: movementTypeSchema.optional(),
  quantity: z.coerce.number().refine((value) => value !== 0, {
    message: "quantity must not be zero"
  }),
  referenceType: z.string().trim().min(1).max(50).optional(),
  referenceId: uuidParam.nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  metadata: jsonRecordSchema.optional()
});

export {
  inventoryAdjustBodySchema,
  inventoryProductIdParamsSchema,
  inventoryProductQuerySchema,
  stockMovementQuerySchema
};
