import express from "express";
import { getChatUsers, getMessages, sendMessage, getAllUsers } from "../controllers/chat.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/users", verifyToken, getChatUsers);
router.get("/all-users", verifyToken, getAllUsers);
router.get("/messages/:userId", verifyToken, getMessages);
router.post("/send", verifyToken, sendMessage);

export default router;
