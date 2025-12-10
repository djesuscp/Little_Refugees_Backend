/*
ACTUALMENTE NO SE USA. Pero no se elimina por conservación preliminar.
*/

import { Router } from "express";
import { createPhoto, getPhotosByAnimal, deletePhoto } from "../controllers/photoController";
import { authenticateJWT } from "../middlewares/authentication";

const router = Router();

// Crear foto (solo ADMIN).
router.post("/", authenticateJWT, createPhoto);

// Eliminar foto (solo ADMIN).
router.delete("/:id", authenticateJWT, deletePhoto);

// Obtener fotos de un animal.
router.get("/:animalId", getPhotosByAnimal);

export default router;
