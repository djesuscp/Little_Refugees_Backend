import { Router } from "express";
import { register, login, me, completeFirstLogin } from "../controllers/authController";
import { authenticateJWT } from "../middlewares/authentication";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateJWT, me);
router.patch(
  "/first-login-completed",
  authenticateJWT,
  completeFirstLogin
);

export default router;
