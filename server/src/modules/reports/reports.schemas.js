import { z } from "zod";

const uuidParam = z.string().uuid();

const dateRangeFields = {
  dateFrom: z.string().trim().date().optional(),
  dateTo: z.string().trim().date().optional()
};

function withDateRangeCheck(schema, fromField = "dateFrom", toField = "dateTo") {
  return schema.refine((value) => !value[fromField] || !value[toField] || value[fromField] <= value[toField], {
    message: `${fromField} must be before or equal to ${toField}`,
    path: [fromField]
  });
}

const paginationFields = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional()
};

const summaryQuerySchema = withDateRangeCheck(
  z.object({
    ...dateRangeFields,
    vendorId: uuidParam.optional()
  })
);

const orderReportQuerySchema = withDateRangeCheck(
  z.object({
    ...paginationFields,
    ...dateRangeFields,
    customerId: uuidParam.optional(),
    status: z.string().trim().min(1).max(40).optional(),
    deliveryDateFrom: z.string().trim().date().optional(),
    deliveryDateTo: z.string().trim().date().optional(),
    search: z.string().trim().min(1).max(200).optional(),
    vendorId: uuidParam.optional()
  })
).refine(
  (value) =>
    !value.deliveryDateFrom ||
    !value.deliveryDateTo ||
    value.deliveryDateFrom <= value.deliveryDateTo,
  {
    message: "deliveryDateFrom must be before or equal to deliveryDateTo",
    path: ["deliveryDateFrom"]
  }
);

const invoiceReportQuerySchema = withDateRangeCheck(
  z.object({
    ...paginationFields,
    ...dateRangeFields,
    customerId: uuidParam.optional(),
    orderId: uuidParam.optional(),
    status: z.string().trim().min(1).max(40).optional(),
    dueDateFrom: z.string().trim().date().optional(),
    dueDateTo: z.string().trim().date().optional(),
    search: z.string().trim().min(1).max(200).optional(),
    vendorId: uuidParam.optional()
  })
).refine((value) => !value.dueDateFrom || !value.dueDateTo || value.dueDateFrom <= value.dueDateTo, {
  message: "dueDateFrom must be before or equal to dueDateTo",
  path: ["dueDateFrom"]
});

const paymentReportQuerySchema = withDateRangeCheck(
  z.object({
    ...paginationFields,
    ...dateRangeFields,
    customerId: uuidParam.optional(),
    invoiceId: uuidParam.optional(),
    paymentMethod: z.string().trim().min(1).max(50).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    vendorId: uuidParam.optional()
  })
);

const customerStatementParamsSchema = z.object({
  customerId: uuidParam
});

const customerStatementQuerySchema = withDateRangeCheck(
  z.object({
    ...dateRangeFields,
    vendorId: uuidParam.optional()
  })
);

export {
  customerStatementParamsSchema,
  customerStatementQuerySchema,
  invoiceReportQuerySchema,
  orderReportQuerySchema,
  paymentReportQuerySchema,
  summaryQuerySchema
};
