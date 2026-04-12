import { z } from "zod";
import { LOOKUP_OPTION_GROUPS } from "./lookups.constants.js";

const uuidParam = z.string().uuid();
const limitQuery = z.coerce.number().int().min(1).max(50).optional();

const lookupQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  limit: limitQuery,
  vendorId: uuidParam.optional()
});

const productLookupQuerySchema = lookupQuerySchema.extend({
  status: z.enum(["draft", "active", "archived"]).optional(),
  categoryId: uuidParam.optional()
});

const vendorLookupQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  limit: limitQuery,
  status: z.enum(LOOKUP_OPTION_GROUPS.vendorStatuses).optional()
});

export { lookupQuerySchema, productLookupQuerySchema, vendorLookupQuerySchema };
