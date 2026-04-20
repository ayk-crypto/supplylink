import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import authenticate from "../../middlewares/authenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { login, logout, me, register } from "./auth.controller.js";
import { loginBodySchema, registerBodySchema } from "./auth.schemas.js";

const router = Router();

router.post("/register", validateRequest({ body: registerBodySchema }), asyncHandler(register));
router.post("/login", validateRequest({ body: loginBodySchema }), asyncHandler(login));
router.get("/me", authenticate, asyncHandler(me));
router.post("/logout", authenticate, asyncHandler(logout));

export default router;
