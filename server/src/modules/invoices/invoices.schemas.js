import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const invoiceStatusEnum = z.enum(["draft", "issued", "partially_paid", "paid", "void"]);
const invoiceCreateStatusEnum = z.enum(["draft", "issued"]);

const invoiceIdParamsSchema = z.object({
  invoiceId: uuidParam
});

const invoiceQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    status: invoiceStatusEnum.optional(),
    customerId: uuidParam.optional(),
    orderId: uuidParam.optional(),
    invoiceNumber: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    issueDateFrom: z.string().trim().date().optional(),
    issueDateTo: z.string().trim().date().optional(),
    dueDateFrom: z.string().trim().date().optional(),
    dueDateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine(
    (value) => !value.issueDateFrom || !value.issueDateTo || value.issueDateFrom <= value.issueDateTo,
    {
      message: "issueDateFrom must be before or equal to issueDateTo",
      path: ["issueDateFrom"]
    }
  )
  .refine((value) => !value.dueDateFrom || !value.dueDateTo || value.dueDateFrom <= value.dueDateTo, {
    message: "dueDateFrom must be before or equal to dueDateTo",
    path: ["dueDateFrom"]
  });

const invoiceItemSchema = z
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

const invoiceCreateBodySchema = z
  .object({
    customerId: uuidParam.optional(),
    orderId: uuidParam.optional(),
    invoiceNumber: z.string().trim().min(1).max(100).optional(),
    issueDate: z.string().trim().date().nullable().optional(),
    dueDate: z.string().trim().date().nullable().optional(),
    status: invoiceCreateStatusEnum.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    items: z.array(invoiceItemSchema).min(1).max(200).optional()
  })
  .refine((value) => Boolean(value.customerId || value.orderId), {
    message: "Either customerId or orderId is required",
    path: ["customerId"]
  })
  .refine((value) => Boolean(value.orderId || value.items), {
    message: "items are required for direct invoice creation",
    path: ["items"]
  });

const invoiceUpdateBodySchema = z
  .object({
    customerId: uuidParam.optional(),
    invoiceNumber: z.string().trim().min(1).max(100).optional(),
    issueDate: z.string().trim().date().nullable().optional(),
    dueDate: z.string().trim().date().nullable().optional(),
    status: invoiceStatusEnum.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    items: z.array(invoiceItemSchema).min(1).max(200).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

export {
  invoiceCreateBodySchema,
  invoiceIdParamsSchema,
  invoiceQuerySchema,
  invoiceStatusEnum,
  invoiceUpdateBodySchema
};
