import express from "express";
import {
  getUser,
  getUserFriends,
  addRemoveFriend,
  editUserProfile,
} from "../controllers/users.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/:id", verifyToken, getUser);
router.get("/:id/friends", verifyToken, getUserFriends);
router.patch("/:id/:friendId", verifyToken, addRemoveFriend);
router.put("/:id", verifyToken, editUserProfile);

export default router;
