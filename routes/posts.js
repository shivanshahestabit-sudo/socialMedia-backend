const express = require("express");
const {
  getFeedPosts,
  getUserPosts,
  likePost,
  addComment,
  deletePost,
  editPost,
} = require("../controllers/posts.js");
const { verifyToken } = require("../middleware/auth.js");


const router = express.Router();

router.get("/", verifyToken, getFeedPosts);
router.get("/:userId/posts", verifyToken, getUserPosts);
router.patch("/:id/like", verifyToken, likePost);
router.post("/:id/comment", verifyToken, addComment);
router.delete("/:id", verifyToken, deletePost);
router.put("/:postId/:userId", editPost);

module.exports = router;