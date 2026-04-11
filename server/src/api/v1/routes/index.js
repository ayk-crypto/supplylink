import { Router } from "express";
import systemRoutes from "../../../modules/system/system.routes.js";
import authRoutes from "../../../modules/auth/auth.routes.js";
import vendorsRoutes from "../../../modules/vendors/vendors.routes.js";
import customersRoutes from "../../../modules/customers/customers.routes.js";
import categoriesRoutes from "../../../modules/products/categories.routes.js";
import productsRoutes from "../../../modules/products/products.routes.js";
import ordersRoutes from "../../../modules/orders/orders.routes.js";
import invoicesRoutes from "../../../modules/invoices/invoices.routes.js";
import quotationsRoutes from "../../../modules/quotations/quotations.routes.js";
import ledgerRoutes from "../../../modules/ledger/ledger.routes.js";
import routesRoutes from "../../../modules/routes/routes.routes.js";
import subscriptionsRoutes from "../../../modules/subscriptions/subscriptions.routes.js";

const router = Router();

router.use("/system", systemRoutes);
router.use("/auth", authRoutes);
router.use("/vendors", vendorsRoutes);
router.use("/customers", customersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/products", productsRoutes);
router.use("/orders", ordersRoutes);
router.use("/invoices", invoicesRoutes);
router.use("/quotations", quotationsRoutes);
router.use("/ledger", ledgerRoutes);
router.use("/routes", routesRoutes);
router.use("/subscriptions", subscriptionsRoutes);

export default router;
