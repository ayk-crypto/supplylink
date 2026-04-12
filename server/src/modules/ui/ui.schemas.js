import { z } from "zod";

const uuidParam = z.string().uuid();

const uiVendorQuerySchema = z.object({
  vendorId: uuidParam.optional()
});

const uiContextQuerySchema = uiVendorQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(30).optional()
});

const uiPanelQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).optional()
});

export { uiContextQuerySchema, uiPanelQuerySchema, uiVendorQuerySchema };
