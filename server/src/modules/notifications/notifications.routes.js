import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { getById, list, markAllRead, markRead, unreadCount } from "./notifications.controller.js";
import {
  notificationIdParamsSchema,
  notificationQuerySchema
} from "./notifications.schemas.js";

const notificationsRoutes = Router();

notificationsRoutes.get(
  "/",
  authenticate,
  validateRequest({ query: notificationQuerySchema }),
  asyncHandler(list)
);

notificationsRoutes.get(
  "/unread-count",
  authenticate,
  asyncHandler(unreadCount)
);

notificationsRoutes.patch(
  "/read-all",
  authenticate,
  asyncHandler(markAllRead)
);

notificationsRoutes.post(
  "/read-all",
  authenticate,
  asyncHandler(markAllRead)
);

notificationsRoutes.get(
  "/:notificationId",
  authenticate,
  validateRequest({ params: notificationIdParamsSchema }),
  asyncHandler(getById)
);

notificationsRoutes.patch(
  "/:notificationId/read",
  authenticate,
  validateRequest({ params: notificationIdParamsSchema }),
  asyncHandler(markRead)
);

notificationsRoutes.post(
  "/:notificationId/read",
  authenticate,
  validateRequest({ params: notificationIdParamsSchema }),
  asyncHandler(markRead)
);

export default notificationsRoutes;
