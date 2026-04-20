import { z } from "zod";

const healthQuerySchema = z.object({
  includeModules: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export { healthQuerySchema };
