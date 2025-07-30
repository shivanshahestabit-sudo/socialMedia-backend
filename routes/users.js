const express = require("express");
const {
  getUser,
  getUserFriends,
  addRemoveFriend,
  editUserProfile,
} = require("../controllers/users.js");
const { verifyToken } = require("../middleware/auth.js");


const router = express.Router();

router.get("/:id", verifyToken, getUser);
router.get("/:id/friends", verifyToken, getUserFriends);
router.patch("/:id/:friendId", verifyToken, addRemoveFriend);
router.put("/:id", verifyToken, editUserProfile);

module.exports = router;
