import { z } from "zod";

const publicTokenParamsSchema = z.object({
  token: z.string().trim().min(16).max(200)
});

export { publicTokenParamsSchema };
