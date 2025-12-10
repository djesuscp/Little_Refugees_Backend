import { Router } from "express";
import {
  createAnimal,
  getAllAnimalsForUser,
  getAllAnimalsForAdmin,
  getAnimalByIdForUser,
  getAnimalByIdForAdmin,
  updateAnimal,
  deleteAnimal
} from "../controllers/animalController";
import {
  getAnimalPhotos,
  uploadAnimalPhotosController,
  deleteAnimalPhotoController,
  deleteAllAnimalPhotosController
} from '../controllers/animalPhotoController';
import { uploadAnimalPhotos } from '../middlewares/uploadAnimalPhotos';
import { authenticateJWT, authorizeRoles } from "../middlewares/authentication";

const router = Router();

// Rutas protegidas (solo ADMIN).
router.get("/admin", authenticateJWT, getAllAnimalsForAdmin);
router.get("/admin/:id", authenticateJWT, getAnimalByIdForAdmin);
router.post("/admin", authenticateJWT, createAnimal);
router.put("/admin/:id", authenticateJWT, updateAnimal);
router.delete("/admin/:id", authenticateJWT, deleteAnimal);

// Obtener fotos de un animal (solo ADMIN).
router.get(
  "/admin/:id/photos",
  authenticateJWT,
  getAnimalPhotos
);

// Subir fotos a un animal (máximo 5).
router.post(
  '/admin/:id/photos',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  uploadAnimalPhotos.array('photos', 5),
  uploadAnimalPhotosController
);

// Eliminar una foto concreta.
router.delete(
  '/admin/:animalId/photos/:photoId',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  deleteAnimalPhotoController
);

// Eliminar TODAS las fotos de un animal.
router.delete(
  '/admin/:animalId/photos',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  deleteAllAnimalPhotosController
);

// Rutas públicas.
router.get("/", authenticateJWT, getAllAnimalsForUser);
router.get("/:id", authenticateJWT, getAnimalByIdForUser);

export default router;