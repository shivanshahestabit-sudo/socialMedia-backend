import express from "express";
import { getFeedPosts, getUserPosts, likePost, addComment, deletePost, editPost } from "../controllers/posts.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", verifyToken, getFeedPosts);
router.get("/:userId/posts", verifyToken, getUserPosts);
router.patch("/:id/like", verifyToken, likePost);
router.post("/:id/comment", verifyToken, addComment);
router.delete("/:id", verifyToken, deletePost);
router.put("/:postId/:userId", editPost);

export default router;
