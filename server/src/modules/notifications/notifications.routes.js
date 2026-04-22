import { Router } from "express";
import authenticate from "../../middlewares/authenticate.js";
import validateRequest from "../../middlewares/validateRequest.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { bulkRead, getById, list, markAllRead, markRead, unreadCount } from "./notifications.controller.js";
import {
  notificationBulkReadBodySchema,
  notificationIdParamsSchema,
  notificationQuerySchema
} from "./notifications.schemas.js";
import { emptyBodySchema } from "../../core/http/emptySchema.js";

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
  validateRequest({ body: emptyBodySchema }),
  asyncHandler(markAllRead)
);

notificationsRoutes.post(
  "/bulk-read",
  authenticate,
  validateRequest({ body: notificationBulkReadBodySchema }),
  asyncHandler(bulkRead)
);

notificationsRoutes.post(
  "/read-all",
  authenticate,
  validateRequest({ body: emptyBodySchema }),
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
  validateRequest({ params: notificationIdParamsSchema, body: emptyBodySchema }),
  asyncHandler(markRead)
);

notificationsRoutes.post(
  "/:notificationId/read",
  authenticate,
  validateRequest({ params: notificationIdParamsSchema, body: emptyBodySchema }),
  asyncHandler(markRead)
);

export default notificationsRoutes;
