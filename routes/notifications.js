import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/notification.js";

const router = express.Router();

router.get("/:userId", verifyToken, getUserNotifications);
router.patch("/:id/read", verifyToken, markNotificationAsRead);
router.patch("/user/:userId/read-all", verifyToken, markAllNotificationsAsRead);

export default router;
