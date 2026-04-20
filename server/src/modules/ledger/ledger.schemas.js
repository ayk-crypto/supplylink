import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());

const paymentIdParamsSchema = z.object({
  paymentId: uuidParam
});

const customerLedgerParamsSchema = z.object({
  customerId: uuidParam
});

const paymentQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    customerId: uuidParam.optional(),
    invoiceId: uuidParam.optional(),
    paymentMethod: z.string().trim().min(1).max(50).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    paymentDateFrom: z.string().trim().date().optional(),
    paymentDateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine(
    (value) =>
      !value.paymentDateFrom ||
      !value.paymentDateTo ||
      value.paymentDateFrom <= value.paymentDateTo,
    {
      message: "paymentDateFrom must be before or equal to paymentDateTo",
      path: ["paymentDateFrom"]
    }
  );

const ledgerQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    customerId: uuidParam.optional(),
    entryType: z.enum(["debit", "credit"]).optional(),
    sourceType: z.enum(["invoice", "payment", "adjustment", "opening_balance"]).optional(),
    entryDateFrom: z.string().trim().date().optional(),
    entryDateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine(
    (value) =>
      !value.entryDateFrom || !value.entryDateTo || value.entryDateFrom <= value.entryDateTo,
    {
      message: "entryDateFrom must be before or equal to entryDateTo",
      path: ["entryDateFrom"]
    }
  );

const paymentCreateBodySchema = z
  .object({
    customerId: uuidParam,
    invoiceId: uuidParam.optional(),
    paymentDate: z.string().trim().date().optional(),
    amount: z.coerce.number().positive(),
    paymentMethod: z.string().trim().min(1).max(50).nullable().optional(),
    referenceNumber: z.string().trim().min(1).max(100).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine((value) => value.amount > 0, {
    message: "Payment amount must be greater than zero",
    path: ["amount"]
  });

const paymentUpdateBodySchema = z
  .object({
    paymentMethod: z.string().trim().min(1).max(50).nullable().optional(),
    referenceNumber: z.string().trim().min(1).max(100).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  });

export {
  customerLedgerParamsSchema,
  ledgerQuerySchema,
  paymentCreateBodySchema,
  paymentIdParamsSchema,
  paymentQuerySchema,
  paymentUpdateBodySchema
};
