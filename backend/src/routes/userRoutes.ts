import { Router } from "express";
import {
  updateMyProfile,
  deleteMyAccount,
  deleteUserByOwner,
  updateFirstLoginStatus
} from "../controllers/userController";
import { authenticateJWT } from "../middlewares/authentication";

const router = Router();

// Actualizar el estado del primer login.
router.put("/first-login", authenticateJWT, updateFirstLoginStatus);

// Actualizar mi perfil (USER o ADMIN)
router.put("/me", authenticateJWT, updateMyProfile);

// Eliminar mi cuenta (solo usuarios normales — la lógica lo valida)
router.delete("/me", authenticateJWT, deleteMyAccount);

// Eliminar a otro usuario (owner elimina admin)
router.delete("/:id", authenticateJWT, deleteUserByOwner);

export default router;
