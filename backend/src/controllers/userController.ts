import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../prisma/client";
import { sendEmail } from "../utils/mailer";
import { RequestStatus } from "@prisma/client";
import { AuthRequest } from "../middlewares/authentication";

// Marcar/actualizar el estado de primer login completado.
export const updateFirstLoginStatus = async (req: AuthRequest, res: Response) => {
  try {
    // Comprobar si existe el usuario.
    if (!req.user) return res.status(401).json({ message: "No autorizado." });

    const { firstLoginCompleted } = req.body;

    // Validar que se envía un booleano.
    if (typeof firstLoginCompleted !== "boolean") {
      return res.status(400).json({ message: "El campo firstLoginCompleted debe ser booleano." });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstLoginCompleted },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isAdminOwner: true,
        shelterId: true,
        firstLoginCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      message: "Estado de primer acceso actualizado correctamente.",
      user: updated,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error interno del servidor. No ha sido posible actualizar el estado de primer acceso.",
      error,
    });
  }
};

// Actualizar el perfil del usuario autenticado (USER o ADMIN).
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;

    // Comprobar si existe el usuario.
    if (!authUser) return res.status(401).json({ message: "No autorizado." });

    const { fullName, email, currentPassword, newPassword } = req.body;
    const updates: any = {};

    // Comprobar que se ha enviado la contraseña actual para confirmar cambios.
    if (!currentPassword) {
      return res.status(400).json({
        message: "Debes introducir tu contraseña actual para actualizar tus datos.",
      });
    }

    // Traer usuario desde BD para comparar la contraseña real.
    const dbUser = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!dbUser) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return res.status(403).json({ message: "La contraseña actual es incorrecta." });
    }

    // Si se ha modificado, actualizar nombre.
    if (fullName) {
      updates.fullName = fullName;
    }

    // Si se ha modificado, actualizar email.
    if (email) {
      // Comprobar si otro usuario tiene ese email.
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== authUser.id) {
        return res.status(400).json({ message: "El email ya está en uso por otro usuario." });
      }

      // Comprobar si una protectora ya usa ese email.
      const existingShelter = await prisma.shelter.findUnique({ where: { email } });
      if (existingShelter) {
        return res.status(400).json({ message: "El email ya está asignado a una protectora." });
      }

      updates.email = email;
    }

    // Si se ha solicitado cambio de contraseña, generar hash de la nueva.
    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10);
      updates.password = hashed;
    }

    // Comprobar que realmente hay algo que actualizar.
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No se ha proporcionado ningún dato para actualizar.",
      });
    }

    // Actualizar usuario.
    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: updates,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isAdminOwner: true,
        shelterId: true,
        firstLoginCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res
      .status(200)
      .json({ message: "Perfil actualizado correctamente.", user: updated });
  } catch (error) {
    return res.status(500).json({
      message: "Error interno del servidor. No ha sido posible actualizar el usuario.",
      error,
    });
  }
};

// Eliminar la propia cuenta (solo USERS).
export const deleteMyAccount = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user; // datos del token
    if (!authUser) return res.status(401).json({ message: "No autorizado." });

    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ message: "Debes proporcionar tu contraseña para eliminar la cuenta." });
    }

    // Recuperar usuario completo (con contraseña).
    const user = await prisma.user.findUnique({
      where: { id: authUser.id }
    });

    if (!user) return res.status(404).json({ message: "Usuario no encontrado." });

    // ADMIN propietario no puede borrarse a sí mismo.
    if (user.role === "ADMIN" && user.isAdminOwner) {
      return res.status(403).json({
        message:
          "El propietario de una protectora no puede eliminar su cuenta. Transfiere la titularidad o elimina la protectora primero."
      });
    }

    // ADMIN no propietario pero con protectora no se puede eliminar a sí mismo.
    if (user.role === "ADMIN" && !user.isAdminOwner && user.shelterId) {
      return res.status(403).json({
        message: "Solo el propietario de la protectora puede eliminar tu cuenta."
      });
    }

    // Verificar contraseña actual.
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "La contraseña proporcionada es incorrecta." });
    }

    // Comprobar solicitudes activas.
    const problematicRequest = await prisma.adoptionRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: [RequestStatus.REJECTED, RequestStatus.PENDING, RequestStatus.APPROVED] },
      },
    });

    if (problematicRequest) {
      return res.status(400).json({
        message: "No puedes eliminar tu cuenta si tienes solicitudes de adopción registradas. Pide al administrador que elimine tus solicitudes presentadas."
      });
    }

    // Eliminar usuario.
    await prisma.user.delete({ where: { id: user.id } });

    return res.json({ message: "Cuenta eliminada correctamente." });

  } catch (error) {
    return res.status(500).json({
      message: "Error interno del servidor. No ha sido posible eliminar esta cuenta.",
      error
    });
  }
};

// Eliminar a otro usuario (solo admin owner puede eliminar admins no propietarios).
export const deleteUserByOwner = async (req: Request, res: Response) => {
  try {
    const actor = (req as any).user;
    if (!actor) return res.status(401).json({ message: "No autorizado." });

    const targetId = Number(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ message: "ID inválido." });

    // Comprobar que el usuario sea ADMIN propietario.
    if (!actor.isAdminOwner) return res.status(403).json({ message: "Solo el propietario puede eliminar administradores" });

    // Obtener usuario a eliminar.
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ message: "Usuario no encontrado." });

    // El usuario a eliminar debe pertenecer a la protectora del propietario.
    if (target.shelterId !== actor.shelterId) {
      return res.status(403).json({ message: "El usuario no pertenece a tu protectora." });
    }

    // El usuario ADMIN propietario no podrá eliminar a otro propietario.
    if (target.isAdminOwner) {
      return res.status(403).json({ message: "No puedes eliminar a otro propietario." });
    }

    // Si el usuario a eliminar tiene solicitudes pendientes o aprobadas, no se puede eliminar.
    const hasRequests = await prisma.adoptionRequest.findFirst({
      where: { userId: targetId, status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] } },
    });
    if (hasRequests) return res.status(400).json({ message: "El administrador tiene solicitudes activas y no puede ser eliminado." });

    // Eliminar usuario.
    await prisma.user.delete({ where: { id: targetId } });

    return res.json({ message: "Usuario eliminado correctamente." });
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor. No ha sido posible eliminar a este usuario.", error });
  }
};
