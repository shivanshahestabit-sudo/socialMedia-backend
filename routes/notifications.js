const express = require("express");
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notification.js");
const { verifyToken } = require("../middleware/auth.js");

const router = express.Router();

router.get("/:userId", verifyToken, getUserNotifications);
router.patch("/:id/read", verifyToken, markNotificationAsRead);
router.patch("/user/:userId/read-all", verifyToken, markAllNotificationsAsRead);

module.exports = router;