import express from "express";
import { login, googleLogin, } from "../controllers/auth.js";
import { verifyToken } from "../middleware/auth.js";
import { verifyGoogleToken } from "../middleware/googleAuth.js";

const router = express.Router();

router.post("/login", login);
router.post("/social-login", verifyGoogleToken, googleLogin);
// router.get("/me", verifyToken, getCurrentUser);
// router.post("/logout", verifyToken, logout);


export default router;
