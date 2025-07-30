const express = require("express");
const { login, googleLogin } = require("../controllers/auth.js");
const { verifyToken } = require("../middleware/auth.js");
const { verifyGoogleToken } = require("../middleware/googleAuth.js");

const router = express.Router();

router.post("/login", login);
router.post("/social-login", verifyGoogleToken, googleLogin);

module.exports = router;