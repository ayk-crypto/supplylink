import { z } from "zod";
import { AUTH_FOUNDATION_ROLES } from "../../core/constants/roles.js";

const authRoleEnum = z.enum(AUTH_FOUNDATION_ROLES);

const registerBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(150),
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
    phone: z.string().trim().max(50).optional(),
    roleCode: authRoleEnum.default("vendor_admin"),
    vendorId: z.string().uuid().optional(),
    vendor: z
      .object({
        legalName: z.string().trim().min(2).max(200),
        displayName: z.string().trim().min(2).max(200),
        slug: z
          .string()
          .trim()
          .min(3)
          .max(160)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        contactEmail: z.string().trim().email().optional()
      })
      .optional(),
    jobTitle: z.string().trim().max(120).optional()
  })
  .superRefine((body, context) => {
    if (["vendor_admin", "vendor_staff"].includes(body.roleCode) && !body.vendorId && !body.vendor) {
      context.addIssue({
        code: "custom",
        path: ["vendorId"],
        message: "Vendor users must include vendorId or vendor details"
      });
    }

    if (body.roleCode !== "vendor_admin" && body.vendor) {
      context.addIssue({
        code: "custom",
        path: ["vendor"],
        message: "Only vendor_admin registration can create a new vendor"
      });
    }
  });

const loginBodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  vendorId: z.string().uuid().optional()
});

const vendorQuerySchema = z.object({
  vendorId: z.string().uuid().optional()
});

export { loginBodySchema, registerBodySchema, vendorQuerySchema };
