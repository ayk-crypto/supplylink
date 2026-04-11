import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const quotationStatusEnum = z.enum(["draft", "sent", "accepted", "rejected", "expired"]);

const quotationIdParamsSchema = z.object({
  quotationId: uuidParam
});

const quotationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    status: quotationStatusEnum.optional(),
    customerId: uuidParam.optional(),
    quoteNumber: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    issueDateFrom: z.string().trim().date().optional(),
    issueDateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine(
    (value) =>
      !value.issueDateFrom ||
      !value.issueDateTo ||
      value.issueDateFrom <= value.issueDateTo,
    {
      message: "issueDateFrom must be before or equal to issueDateTo",
      path: ["issueDateFrom"]
    }
  );

const quotationItemSchema = z
  .object({
    productId: uuidParam,
    description: z.string().trim().max(5000).nullable().optional(),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    discountTotal: z.coerce.number().min(0).optional(),
    tax: z.coerce.number().min(0).optional(),
    taxTotal: z.coerce.number().min(0).optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine(
    (value) =>
      !(
        Object.prototype.hasOwnProperty.call(value, "discount") &&
        Object.prototype.hasOwnProperty.call(value, "discountTotal")
      ),
    {
      message: "Use either discount or discountTotal, not both"
    }
  )
  .refine(
    (value) =>
      !(
        Object.prototype.hasOwnProperty.call(value, "tax") &&
        Object.prototype.hasOwnProperty.call(value, "taxTotal")
      ),
    {
      message: "Use either tax or taxTotal, not both"
    }
  );

const quotationCreateBodySchema = z.object({
  customerId: uuidParam,
  quoteNumber: z.string().trim().min(1).max(100).optional(),
  issueDate: z.string().trim().date().nullable().optional(),
  expiryDate: z.string().trim().date().nullable().optional(),
  status: quotationStatusEnum.optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  items: z.array(quotationItemSchema).min(1).max(200)
});

const quotationUpdateBodySchema = z
  .object({
    customerId: uuidParam.optional(),
    quoteNumber: z.string().trim().min(1).max(100).optional(),
    issueDate: z.string().trim().date().nullable().optional(),
    expiryDate: z.string().trim().date().nullable().optional(),
    status: quotationStatusEnum.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    items: z.array(quotationItemSchema).min(1).max(200).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

export {
  quotationCreateBodySchema,
  quotationIdParamsSchema,
  quotationQuerySchema,
  quotationStatusEnum,
  quotationUpdateBodySchema
};
