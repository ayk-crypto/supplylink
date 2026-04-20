import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import authorizeRoles from "../../middlewares/authorizeRoles.js";
import requireVendorAccess from "../../middlewares/requireVendorAccess.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import {
  adminOverview,
  customerStatement,
  customerStatementCsv,
  invoices,
  invoicesCsv,
  orders,
  ordersCsv,
  payments,
  paymentsCsv,
  summary
} from "./reports.controller.js";
import {
  customerStatementParamsSchema,
  customerStatementQuerySchema,
  invoiceReportQuerySchema,
  orderReportQuerySchema,
  paymentReportQuerySchema,
  summaryQuerySchema
} from "./reports.schemas.js";

const reportsRoutes = Router();

const vendorReportAccess = [
  authenticate,
  authorizeRoles("super_admin", "vendor_admin", "vendor_staff")
];

reportsRoutes.get(
  "/summary",
  ...vendorReportAccess,
  validateRequest({ query: summaryQuerySchema }),
  requireVendorAccess(),
  asyncHandler(summary)
);

reportsRoutes.get(
  "/orders",
  ...vendorReportAccess,
  validateRequest({ query: orderReportQuerySchema }),
  requireVendorAccess(),
  asyncHandler(orders)
);

reportsRoutes.get(
  "/invoices",
  ...vendorReportAccess,
  validateRequest({ query: invoiceReportQuerySchema }),
  requireVendorAccess(),
  asyncHandler(invoices)
);

reportsRoutes.get(
  "/payments",
  ...vendorReportAccess,
  validateRequest({ query: paymentReportQuerySchema }),
  requireVendorAccess(),
  asyncHandler(payments)
);

reportsRoutes.get(
  "/customer-statement/:customerId",
  ...vendorReportAccess,
  validateRequest({ params: customerStatementParamsSchema, query: customerStatementQuerySchema }),
  requireVendorAccess(),
  asyncHandler(customerStatement)
);

reportsRoutes.get(
  "/exports/orders.csv",
  ...vendorReportAccess,
  validateRequest({ query: orderReportQuerySchema }),
  requireVendorAccess(),
  asyncHandler(ordersCsv)
);

reportsRoutes.get(
  "/exports/invoices.csv",
  ...vendorReportAccess,
  validateRequest({ query: invoiceReportQuerySchema }),
  requireVendorAccess(),
  asyncHandler(invoicesCsv)
);

reportsRoutes.get(
  "/exports/payments.csv",
  ...vendorReportAccess,
  validateRequest({ query: paymentReportQuerySchema }),
  requireVendorAccess(),
  asyncHandler(paymentsCsv)
);

reportsRoutes.get(
  "/exports/customer-statement/:customerId.csv",
  ...vendorReportAccess,
  validateRequest({ params: customerStatementParamsSchema, query: customerStatementQuerySchema }),
  requireVendorAccess(),
  asyncHandler(customerStatementCsv)
);

reportsRoutes.get(
  "/admin/overview",
  authenticate,
  authorizeRoles("super_admin"),
  asyncHandler(adminOverview)
);

export default reportsRoutes;
