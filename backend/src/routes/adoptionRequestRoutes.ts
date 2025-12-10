import { Router } from "express";
import {
  createAdoptionRequest,
  getMyRequests,
  getRequestsForShelter,
  updateRequestStatus,
  deleteAdoptionRequest,
  getRequestById
} from "../controllers/adoptionRequestController";
import { authenticateJWT } from "../middlewares/authentication";

const router = Router();

// Usuario: crear y ver sus solicitudes.
router.post("/", authenticateJWT, createAdoptionRequest);
router.get("/my-requests", authenticateJWT, getMyRequests);

// Admin: ver solicitudes de su protectora y cambiar estado.
router.get("/shelter", authenticateJWT, getRequestsForShelter);
router.get("/request/:id", authenticateJWT, getRequestById);
router.put("/:id/status", authenticateJWT, updateRequestStatus);

// Admin: borrar solicitud de adopción.
router.delete("/:id", authenticateJWT, deleteAdoptionRequest);

export default router;
