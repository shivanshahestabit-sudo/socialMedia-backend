const express = require("express");
const multer = require("multer");
const path = require("path");
const { verifyToken: protectRoute } = require("../middleware/auth.js");

const {
  getUsersForChat,
  getMessages,
  sendMessage,
  getUnreadMessagesCount,
  markMessagesAsRead,
  getOnlineUsers,
} = require("../controllers/chat.js");

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/assets");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.get("/users", protectRoute, getUsersForChat);
router.get("/messages/:userId", protectRoute, getMessages);
router.post("/send", protectRoute, upload.single("image"), sendMessage);
router.get("/unread-count", protectRoute, getUnreadMessagesCount);
router.patch("/mark-read/:senderId", protectRoute, markMessagesAsRead);
router.get("/online-users", protectRoute, getOnlineUsers);

module.exports = router;