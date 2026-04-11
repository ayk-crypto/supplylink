import { z } from "zod";

const customerIdParamsSchema = z.object({
  customerId: z.string().uuid()
});

const customerStatusEnum = z.enum(["active", "inactive", "blocked"]);

const jsonRecordSchema = z.record(z.string(), z.unknown());

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: customerStatusEnum.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  vendorId: z.string().uuid().optional()
});

const customerMasterShape = {
  fullName: z.string().trim().min(2).max(200).optional(),
  companyName: z.string().trim().min(1).max(200).nullable().optional(),
  email: z.string().trim().email().toLowerCase().nullable().optional(),
  phone: z.string().trim().min(3).max(50).nullable().optional(),
  taxIdentifier: z.string().trim().min(1).max(100).nullable().optional(),
  billingAddress: jsonRecordSchema.optional(),
  shippingAddress: jsonRecordSchema.optional(),
  metadata: jsonRecordSchema.optional()
};

const customerCreateBodySchema = z
  .object({
    customer: z.object({
      ...customerMasterShape,
      fullName: z.string().trim().min(2).max(200)
    }),
    relationship: z
      .object({
        accountCode: z.string().trim().min(1).max(100).nullable().optional(),
        status: customerStatusEnum.optional(),
        creditLimit: z.coerce.number().min(0).optional(),
        priceListCode: z.string().trim().min(1).max(100).nullable().optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
        metadata: jsonRecordSchema.optional()
      })
      .optional()
      .default({})
  })
  .refine((value) => value.customer.email || value.customer.phone, {
    message: "Either customer.email or customer.phone is required for duplicate matching",
    path: ["customer"]
  });

const customerUpdateBodySchema = z
  .object({
    customer: z.object(customerMasterShape).optional(),
    relationship: z
      .object({
        accountCode: z.string().trim().min(1).max(100).nullable().optional(),
        status: customerStatusEnum.optional(),
        creditLimit: z.coerce.number().min(0).optional(),
        priceListCode: z.string().trim().min(1).max(100).nullable().optional(),
        notes: z.string().trim().max(5000).nullable().optional(),
        metadata: jsonRecordSchema.optional()
      })
      .optional()
  })
  .refine((value) => Boolean(value.customer || value.relationship), {
    message: "At least one of customer or relationship must be provided"
  })
  .refine(
    (value) =>
      Object.keys(value.customer || {}).length > 0 ||
      Object.keys(value.relationship || {}).length > 0,
    {
      message: "At least one editable field must be provided"
    }
  );

export {
  customerCreateBodySchema,
  customerIdParamsSchema,
  customerUpdateBodySchema,
  paginationQuerySchema
};
