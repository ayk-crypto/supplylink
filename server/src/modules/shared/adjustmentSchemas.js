import { z } from "zod";

const discountTypeEnum = z.enum(["flat", "percent"]);

const discountTaxFields = {
  discountType: discountTypeEnum.nullable().optional(),
  discountValue: z.coerce.number().min(0).optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional()
};

function applyDiscountTaxRefinements(schema) {
  return schema
    .refine(
      (value) =>
        !(
          Object.prototype.hasOwnProperty.call(value, "discountType") &&
          value.discountType &&
          !Object.prototype.hasOwnProperty.call(value, "discountValue")
        ),
      {
        message: "discountValue is required when discountType is provided",
        path: ["discountValue"]
      }
    )
    .refine(
      (value) =>
        !(
          Object.prototype.hasOwnProperty.call(value, "discountValue") &&
          value.discountValue > 0 &&
          !value.discountType
        ),
      {
        message: "discountType is required when discountValue is greater than zero",
        path: ["discountType"]
      }
    )
    .refine(
      (value) =>
        value.discountType !== "percent" ||
        !Object.prototype.hasOwnProperty.call(value, "discountValue") ||
        value.discountValue <= 100,
      {
        message: "Percent discount must be between 0 and 100",
        path: ["discountValue"]
      }
    )
    .refine(
      (value) => !value.taxEnabled || Object.prototype.hasOwnProperty.call(value, "taxRate"),
      {
        message: "taxRate is required when taxEnabled is true",
        path: ["taxRate"]
      }
    )
    .refine(
      (value) =>
        !(
          Object.prototype.hasOwnProperty.call(value, "taxRate") &&
          value.taxRate > 0 &&
          !value.taxEnabled
        ),
      {
        message: "taxEnabled must be true when taxRate is greater than zero",
        path: ["taxEnabled"]
      }
    );
}

export { applyDiscountTaxRefinements, discountTaxFields, discountTypeEnum };
