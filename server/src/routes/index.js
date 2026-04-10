import { Router } from "express";
import { getStatus } from "../controllers/statusController.js";

const router = Router();

router.get("/health", (request, response) => {
  void request;
  response.status(200).json({ status: "ok" });
});

router.get("/status", getStatus);

export default router;
