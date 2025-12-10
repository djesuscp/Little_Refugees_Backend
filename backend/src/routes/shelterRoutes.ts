import express from "express";
import {
  addAdminToShelter,
  createShelter,
  getAllShelters,
  getShelterById,
  getShelterByIdOnlyAdmin,
  getMyShelterAdmins,
  updateShelter,
  deleteShelter,
  removeAdminFromShelter,
} from "../controllers/shelterController";
import { authenticateJWT, authorizeRoles } from "../middlewares/authentication";
import { get } from "http";

const router = express.Router();

// Rutas públicas
router.get("/", getAllShelters);
router.get("/:id", getShelterById);
router.post("/create-shelter", authenticateJWT, authorizeRoles("USER"), createShelter);

// Rutas protegidas para ADMIN
router.get("/:id/admin", authenticateJWT, authorizeRoles("ADMIN"), getShelterByIdOnlyAdmin);
router.get("/:id/my-shelter-admins", authenticateJWT, getMyShelterAdmins);
router.put("/:id", authenticateJWT, authorizeRoles("ADMIN"), updateShelter);
router.delete("/:id", authenticateJWT, authorizeRoles("ADMIN"), deleteShelter);
router.post("/add-admin", authenticateJWT, authorizeRoles("ADMIN"), addAdminToShelter);
router.post("/remove-admin", authenticateJWT, authorizeRoles("ADMIN"), removeAdminFromShelter);

export default router;

