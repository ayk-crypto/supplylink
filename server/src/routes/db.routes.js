import { Router } from "express";
import { getDatabaseTest } from "../controllers/db.controller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getDatabaseTest));

export default router;
