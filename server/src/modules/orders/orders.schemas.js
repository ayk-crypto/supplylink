import { z } from "zod";

const uuidParam = z.string().uuid();
const jsonRecordSchema = z.record(z.string(), z.unknown());
const orderStatusEnum = z.enum(["draft", "confirmed", "packed", "dispatched", "delivered", "cancelled"]);
const orderCreateStatusEnum = z.enum(["draft", "confirmed"]);

const orderIdParamsSchema = z.object({
  orderId: uuidParam
});

const orderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    status: orderStatusEnum.optional(),
    customerId: uuidParam.optional(),
    quotationId: uuidParam.optional(),
    orderNumber: z.string().trim().min(1).max(100).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    orderDateFrom: z.string().trim().date().optional(),
    orderDateTo: z.string().trim().date().optional(),
    vendorId: uuidParam.optional()
  })
  .refine(
    (value) => !value.orderDateFrom || !value.orderDateTo || value.orderDateFrom <= value.orderDateTo,
    {
      message: "orderDateFrom must be before or equal to orderDateTo",
      path: ["orderDateFrom"]
    }
  );

const orderItemSchema = z
  .object({
    productId: uuidParam,
    description: z.string().trim().max(5000).nullable().optional(),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    discountTotal: z.coerce.number().min(0).optional(),
    tax: z.coerce.number().min(0).optional(),
    taxTotal: z.coerce.number().min(0).optional(),
    metadata: jsonRecordSchema.optional()
  })
  .refine(
    (value) =>
      !(
        Object.prototype.hasOwnProperty.call(value, "discount") &&
        Object.prototype.hasOwnProperty.call(value, "discountTotal")
      ),
    {
      message: "Use either discount or discountTotal, not both"
    }
  )
  .refine(
    (value) =>
      !(
        Object.prototype.hasOwnProperty.call(value, "tax") &&
        Object.prototype.hasOwnProperty.call(value, "taxTotal")
      ),
    {
      message: "Use either tax or taxTotal, not both"
    }
  );

const orderCreateBodySchema = z
  .object({
    customerId: uuidParam.optional(),
    quotationId: uuidParam.optional(),
    orderNumber: z.string().trim().min(1).max(100).optional(),
    orderDate: z.string().trim().date().nullable().optional(),
    requestedDeliveryDate: z.string().trim().date().nullable().optional(),
    deliveryDate: z.string().trim().date().nullable().optional(),
    status: orderCreateStatusEnum.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    items: z.array(orderItemSchema).min(1).max(200).optional()
  })
  .refine((value) => Boolean(value.customerId || value.quotationId), {
    message: "Either customerId or quotationId is required",
    path: ["customerId"]
  })
  .refine((value) => Boolean(value.quotationId || value.items), {
    message: "items are required for direct order creation",
    path: ["items"]
  })
  .refine(
    (value) =>
      !(
        Object.prototype.hasOwnProperty.call(value, "requestedDeliveryDate") &&
        Object.prototype.hasOwnProperty.call(value, "deliveryDate")
      ),
    {
      message: "Use either requestedDeliveryDate or deliveryDate, not both"
    }
  );

const orderUpdateBodySchema = z
  .object({
    customerId: uuidParam.optional(),
    orderNumber: z.string().trim().min(1).max(100).optional(),
    orderDate: z.string().trim().date().nullable().optional(),
    requestedDeliveryDate: z.string().trim().date().nullable().optional(),
    deliveryDate: z.string().trim().date().nullable().optional(),
    status: orderStatusEnum.optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    items: z.array(orderItemSchema).min(1).max(200).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field must be provided"
  })
  .refine(
    (value) =>
      !(
        Object.prototype.hasOwnProperty.call(value, "requestedDeliveryDate") &&
        Object.prototype.hasOwnProperty.call(value, "deliveryDate")
      ),
    {
      message: "Use either requestedDeliveryDate or deliveryDate, not both"
    }
  );

export {
  orderCreateBodySchema,
  orderIdParamsSchema,
  orderQuerySchema,
  orderStatusEnum,
  orderUpdateBodySchema
};
