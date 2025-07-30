const express = require("express");
const { getChatUsers, getMessages, sendMessage, getAllUsers } = require("../controllers/chat.js");
const { verifyToken } = require("../middleware/auth.js");

const router = express.Router();

router.get("/users", verifyToken, getChatUsers);
router.get("/all-users", verifyToken, getAllUsers);
router.get("/messages/:userId", verifyToken, getMessages);
router.post("/send", verifyToken, sendMessage);

module.exports = router;