import { z } from "zod";

const vendorIdParamsSchema = z.object({
  vendorId: z.string().uuid()
});

const vendorStatusEnum = z.enum(["draft", "active", "suspended", "archived"]);

const paginationQuerySchema = z.object({
  page: z
    .coerce
    .number()
    .int()
    .min(1)
    .optional(),
  pageSize: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional(),
  status: vendorStatusEnum.optional(),
  search: z.string().trim().min(1).max(200).optional()
});

const vendorCreateBodySchema = z.object({
  vendorName: z.string().trim().min(2).max(200),
  adminName: z.string().trim().min(2).max(150),
  adminEmail: z.string().trim().email(),
  temporaryPassword: z.string().min(8).max(72)
});

const baseVendorUpdateShape = {
  legalName: z.string().trim().min(2).max(200).optional(),
  displayName: z.string().trim().min(2).max(200).optional(),
  contactEmail: z.string().trim().email().nullable().optional(),
  contactPhone: z.string().trim().max(50).nullable().optional(),
  currencyCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/)
    .transform((value) => value.toUpperCase())
    .optional(),
  timezone: z.string().trim().min(2).max(100).optional()
};

const atLeastOneEditableField = (value) => Object.keys(value).length > 0;

const baseVendorUpdateBodySchema = z
  .object(baseVendorUpdateShape)
  .refine(atLeastOneEditableField, {
    message: "At least one editable field must be provided"
  });

const superAdminVendorUpdateBodySchema = z
  .object({
    ...baseVendorUpdateShape,
    slug: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .optional(),
    status: vendorStatusEnum.optional()
  })
  .refine(atLeastOneEditableField, {
    message: "At least one editable field must be provided"
  });

export {
  baseVendorUpdateBodySchema,
  paginationQuerySchema,
  superAdminVendorUpdateBodySchema,
  vendorCreateBodySchema,
  vendorIdParamsSchema
};
