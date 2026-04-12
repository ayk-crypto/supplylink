import { z } from "zod";

const uuidParam = z.string().uuid();
const booleanQueryParam = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean().optional());

const uiVendorQuerySchema = z.object({
  vendorId: uuidParam.optional(),
  includeNotifications: booleanQueryParam
});

const uiContextQuerySchema = uiVendorQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(30).optional()
});

const uiPanelQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).optional()
});

export { uiContextQuerySchema, uiPanelQuerySchema, uiVendorQuerySchema };
