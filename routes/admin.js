const express = require("express");
const {getAllUsers} = require("../controllers/admin.js");
const {verifyToken} = require("../middleware/auth.js");

const router = express.Router();

router.get("/users", verifyToken, getAllUsers);

module.exports = router;