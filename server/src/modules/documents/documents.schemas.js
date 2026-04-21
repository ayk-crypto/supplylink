import { z } from "zod";

const publicTokenParamsSchema = z.object({
  token: z.string().trim().min(16).max(200)
});

const optionalTrimmedEmailSchema = z.union([z.string().trim().email(), z.literal("")]);
const optionalTrimmedTextSchema = z.union([z.string().trim().max(5000), z.literal("")]);

const documentEmailBodySchema = z.object({
  recipientEmail: optionalTrimmedEmailSchema.optional(),
  subject: optionalTrimmedTextSchema.optional(),
  messageBody: optionalTrimmedTextSchema.optional()
});

export { documentEmailBodySchema, publicTokenParamsSchema };
