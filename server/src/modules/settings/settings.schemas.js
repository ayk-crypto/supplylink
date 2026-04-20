import { z } from "zod";

const optionalEmailSchema = z.union([z.string().trim().email(), z.literal("")]);
const optionalUrlSchema = z.union([z.string().trim().url(), z.literal("")]);
const shortTextSchema = z.string().trim().max(200);

const companySettingsSchema = z.object({
  displayName: shortTextSchema.optional(),
  legalName: shortTextSchema.optional(),
  email: optionalEmailSchema.optional(),
  phone: z.string().trim().max(50).optional(),
  taxId: z.string().trim().max(100).optional(),
  addressLine1: z.string().trim().max(250).optional(),
  addressLine2: z.string().trim().max(250).optional(),
  logoUrl: optionalUrlSchema.optional()
});

const invoiceSettingsSchema = z.object({
  prefix: z.string().trim().max(20).optional(),
  suffix: z.string().trim().max(20).optional(),
  nextNumber: z.coerce.number().int().min(1).max(999999999).optional(),
  padding: z.coerce.number().int().min(1).max(12).optional(),
  defaultDueDays: z.coerce.number().int().min(0).max(365).optional(),
  defaultNotes: z.string().trim().max(5000).optional()
});

const currencySettingsSchema = z.object({
  code: z
    .string()
    .trim()
    .length(3)
    .regex(/^[A-Za-z]{3}$/, "Currency code must use three letters")
    .transform((value) => value.toUpperCase())
    .optional(),
  decimals: z.coerce.number().int().min(0).max(4).optional(),
  thousandsSeparator: z.enum([",", ".", " ", "'", ""]).optional()
});

const preferencesSettingsSchema = z.object({
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]).optional(),
  defaultPageSize: z.coerce.number().int().min(5).max(100).optional(),
  notificationsBadgeEnabled: z.boolean().optional(),
  confirmDestructiveActions: z.boolean().optional()
});

const settingsUpdateBodySchema = z
  .object({
    company: companySettingsSchema.optional(),
    invoice: invoiceSettingsSchema.optional(),
    currency: currencySettingsSchema.optional(),
    preferences: preferencesSettingsSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one settings section is required"
  });

const settingsQuerySchema = z.object({
  vendorId: z.string().uuid().optional()
});

export { settingsQuerySchema, settingsUpdateBodySchema };
