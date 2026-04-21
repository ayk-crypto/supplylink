import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const optionalSkuSchema = z.preprocess(
  (value) => {
    if (value === null) {
      return undefined;
    }

    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  },
  z.string().trim().min(1).max(100).optional()
);

const categoryIdParamsSchema = z.object({
  categoryId: uuidParam
});

const productIdParamsSchema = z.object({
  productId: uuidParam
});

const productStatusEnum = z.enum(["draft", "active", "archived"]);

const categoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  vendorId: uuidParam.optional()
});

const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: productStatusEnum.optional(),
  categoryId: uuidParam.optional(),
  sku: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  vendorId: uuidParam.optional()
});

const categoryShape = {
  name: z.string().trim().min(2).max(150).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(5000).nullable().optional()
};

const categoryCreateBodySchema = z.object({
  ...categoryShape,
  name: z.string().trim().min(2).max(150)
});

const categoryUpdateBodySchema = z.object(categoryShape).refine((value) => Object.keys(value).length > 0, {
  message: "At least one editable field must be provided"
});

const productBaseShape = {
  sku: optionalSkuSchema,
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  categoryId: uuidParam.nullable().optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  price: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  status: productStatusEnum.optional(),
  metadata: jsonRecordSchema.optional()
};

const rejectConflictingPriceFields = (value) =>
  !(Object.prototype.hasOwnProperty.call(value, "unitPrice") &&
    Object.prototype.hasOwnProperty.call(value, "price"));

const productCreateBodySchema = z
  .object({
    ...productBaseShape,
    name: z.string().trim().min(2).max(200)
  })
  .refine(rejectConflictingPriceFields, {
    message: "Use either unitPrice or price, not both"
  });

const productUpdateBodySchema = z
  .object(productBaseShape)
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  })
  .refine(rejectConflictingPriceFields, {
    message: "Use either unitPrice or price, not both"
  });

export {
  categoryCreateBodySchema,
  categoryIdParamsSchema,
  categoryQuerySchema,
  categoryUpdateBodySchema,
  productCreateBodySchema,
  productIdParamsSchema,
  productQuerySchema,
  productUpdateBodySchema
};
