import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/authentication";

const prisma = new PrismaClient();

// Crear una nueva protectora (role == USER).
export const createShelter = async (req: any, res: Response) => {
  try {
    const { name, address, phone, email, description } = req.body;

    // Comprobar que el usuario sea USER.
    if (req.user.role !== "USER") return res.status(403).json({ message: "No autorizado." });

    // Verificar si el USER ya pertenece a una protectora.
    const existingUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (existingUser?.shelterId) return res.status(400).json({ message: "Ya perteneces a una protectora existente." });

    // Verificar si ya existe una protectora con ese nombre.
    const existingShelterByName = await prisma.shelter.findUnique({
      where: { name },
    });
    if (existingShelterByName) return res.status(400).json({ message: "Ya existe una protectora con ese nombre." });

    // Verificar si ya existe una protectora con ese email.
    const existingShelterByEmail = await prisma.shelter.findUnique({
      where: { email },
    });
    if (existingShelterByEmail) return res.status(400).json({ message: "Ese email ya está asociado a una protectora." });

    // Verificar si ya existe un usuario con ese email.
    const existingUserEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUserEmail) return res.status(400).json({ message: "Ese email ya está asociado a un usuario." });

    // Verificar si ya existe una protectora con esa dirección.
    const existingAddress = await prisma.shelter.findUnique({
      where: { address },
    });
    if (existingAddress) return res.status(400).json({ message: "La dirección ya está registrada por otra protectora." });

    // Verificar si ya existe una protectora con ese teléfono (solo si se envió teléfono).
    if (phone) {
      const existingPhone = await prisma.shelter.findUnique({
        where: { phone },
      });
      if (existingPhone) return res.status(400).json({ message: "Ese número de teléfono ya está registrado" });
    }

    // Crear la protectora.
    const shelter = await prisma.shelter.create({
      data: {
        name,
        email,
        address,
        phone,
        description,
        admins: {
          connect: { id: req.user.id },
        },
      },
      include: { admins: true },
    });

    // Asignar el id de la protectora al admin actual.
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: "ADMIN", isAdminOwner: true, shelterId: shelter.id, firstLoginCompleted: true},
    });

    // Obtener al usuario actualizado.
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    // Enviar shelter y usuario actualizado.
    return res.status(201).json({
      message: "Protectora creada correctamente.",
      shelter,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible crear la protectora.", error: error.message || error });
  }
};

// Obtener todas las protectoras.
export const getAllShelters = async (_req: Request, res: Response) => {
  try {
    const shelters = await prisma.shelter.findMany({
      include: {
        admins: {
          select: { id: true, fullName: true, email: true },
        },
        animals: true,
      },
    });
    res.status(200).json({ message: "Protectoras obtenidas.", shelters });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible obtener las protectoras.", error });
  }
};

// Obtener protectora por ID.
export const getShelterById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const shelter = await prisma.shelter.findUnique({
      where: { id: Number(id) },
      include: {
        animals: true,
      },
    });

    // Comprobar si la protectora existe.
    if (!shelter) return res.status(404).json({ message: "Protectora no encontrada." });

    res.status(200).json({ message: "Protectora obtenida.", shelter });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible obtener la protectora.", error });
  }
};

// Obtener protectora por ID (solo admin).
export const getShelterByIdOnlyAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Comprobar si el usuario es ADMIN.
    if (req.user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    const shelter = await prisma.shelter.findUnique({
      where: { id: Number(id) },
      include: {
        admins: {
          select: { id: true, fullName: true, email: true, createdAt: true, updatedAt: true },
        },
        animals: true,
      },
    });

    // Comprobar si la protectora existe.
    if (!shelter) return res.status(404).json({ message: "Protectora no encontrada." });

    // Construir datos solicitados.
    const responseData = {
      name: shelter.name,
      email: shelter.email,
      address: shelter.address,
      phone: shelter.phone || null,
      description: shelter.description || null,
      animalsCount: shelter.animals.length,
      adminsCount: shelter.admins.length,
      currentAdmin: {
        id: req.user.id,
        fullName: req.user.fullName,
        email: req.user.email,
        isAdminOwner: req.user.isAdminOwner,
      }
    };

    return res.status(200).json({
      message: "Protectora obtenida.",
      shelter: responseData,
    });

  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible obtener la protectora.", error });
  }
};

// Obtener todos los admins de la protectora del admin owner.
export const getMyShelterAdmins = async (req: any, res: Response) => {
  try {

    // Comprobar si el usuario es ADMIN.
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado." });
    }

    // Comprobar si el usuario es propietario.
    if (!req.user.isAdminOwner) {
      return res.status(403).json({ message: "Solo el propietario de la protectora puede consultar los administradores." });
    }

    // Comprobar si el admin owner pertenece a una protectora.
    if (!req.user.shelterId) {
      return res.status(400).json({ message: "No perteneces a ninguna protectora." });
    }

    // Obtener admins de la protectora.
    const admins = await prisma.user.findMany({
      where: { shelterId: req.user.shelterId, role: "ADMIN" },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      message: "Administradores obtenidos correctamente.",
      admins,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Error interno del servidor. No ha sido posible obtener los administradores.",
      error,
    });
  }
};

// Actualizar protectora.
export const updateShelter = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, phone, email, description, currentPassword } = req.body;

    // Comprobar si la protectora existe.
    const shelter = await prisma.shelter.findUnique({
      where: { id: Number(id) },
      include: { admins: true },
    });
    if (!shelter) return res.status(404).json({ message: "Protectora no encontrada." });

    // Verificar si el usuario es admin de esa protectora.
    if (
      req.user.role !== "ADMIN" ||
      !req.user.isAdminOwner ||
      req.user.shelterId !== shelter.id
    ) return res.status(403).json({ message: "No autorizado." });

    // Verificar contraseña actual.
    if (!currentPassword) {
      return res.status(400).json({
        message: "Debes introducir tu contraseña actual para actualizar la protectora.",
      });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!adminUser) {
      return res.status(404).json({ message: "Usuario administrador no encontrado." });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!passwordMatch) {
      return res.status(403).json({ message: "La contraseña actual es incorrecta." });
    }

    // Comprobar si ya existe otra protectora con ese nombre.
    if (name) {
      const existingByName = await prisma.shelter.findUnique({
        where: { name },
      });
      if (existingByName && existingByName.id !== Number(id))
        return res.status(400).json({ message: "Ya existe otra protectora con ese nombre." });
    }

    // Si se ha modificado, actualizar email.
    if (email) {
      // Comprobar si otro usuario tiene ese email.
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está en uso por otro usuario." });
      }

      // Comprobar si una protectora ya usa ese email.
      const existingShelter = await prisma.shelter.findUnique({ where: { email } });
      if (existingShelter) {
        return res.status(400).json({ message: "El email ya está asignado a una protectora." });
      }
    }

    // Comprobar si ya existe otra protectora con esa dirección.
    if (address) {
      const existingAddress = await prisma.shelter.findUnique({
        where: { address },
      });
      if (existingAddress && existingAddress.id !== Number(id))
        return res.status(400).json({ message: "La dirección ya la usa otra protectora." });
    }

    // Comprobar si ya existe otra protectora con ese teléfono.
    if (phone) {
      const existingPhone = await prisma.shelter.findUnique({
        where: { phone },
      });
      if (existingPhone && existingPhone.id !== Number(id))
        return res.status(400).json({ message: "El teléfono ya está asociado a otra protectora." });
    }

    // Actualizar protectora (✔ actualización parcial).
    const updatedShelter = await prisma.shelter.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(email && { email }),
        ...(description && { description }),
      },
    });

    res.status(200).json({
      message: "Protectora actualizada correctamente.",
      updatedShelter,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error interno del servidor. No ha sido posible actualizar la protectora.",
      error,
    });
  }
};

// Eliminar protectora.
export const deleteShelter = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    // Comprobar si la protectora existe.
    const shelter = await prisma.shelter.findUnique({
      where: { id: Number(id) },
    });
    if (!shelter) return res.status(404).json({ message: "Protectora no encontrada." });

    // Comprobar que el usuario es ADMIN.
    if (req.user.role !== "ADMIN" || req.user.shelterId !== shelter.id) return res.status(403).json({ message: "No autorizado." });

    // Eliminar la protectora.
    await prisma.shelter.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: "Protectora eliminada correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible eliminar la protectora.", error });
  }
};

// Agregar otro admin a la protectora.
export const addAdminToShelter = async (req: any, res: Response) => {
  try {
    const { email } = req.body;

    // Comprobar si el usuario es ADMIN.
    if (req.user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    // Comprobar si el ADMIN es propietario.
    if (!req.user.isAdminOwner) return res.status(403).json({ message: "No es propietario de la protectora." });

    // Comprobar si el ADMIN pertenece a una protectora.
    if (!req.user.shelterId) return res.status(400).json({ message: "Debes pertenecer a una protectora para invitar admins." });

    // Buscar al usuario a invitar.
    const userToInvite = await prisma.user.findUnique({
      where: { email },
    });

    // Comprobar que el usuario a invitar existe.
    if (!userToInvite) return res.status(404).json({ message: "Usuario no encontrado." });

    // Comprobar si ya pertenece a otra protectora.
    if (userToInvite.shelterId) return res.status(400).json({ message: "El usuario ya pertenece a una protectora." });

    // Comprobar si no tiene solicitudes de adopción activas.
    const existingRequests = await prisma.adoptionRequest.findFirst({
      where: { userId: userToInvite.id, status: { in: ["PENDING", "APPROVED"] } },
    });
    if (existingRequests) return res.status(400).json({ message: "El usuario tiene solicitudes de adopción pendientes." });

    // Actualizar al usuario. Se convierte en ADMIN y se asigna el id de la protectora.
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        shelterId: req.user.shelterId,
        isAdminOwner: false,
        firstLoginCompleted: true
      },
    });

    res.status(200).json({
      message: `Usuario ${email} añadido como administrador de la protectora.`,
      updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible asignar el administrador.", error });
  }
};

// Eliminar admin de la protectora.
export const removeAdminFromShelter = async (req: any, res: Response) => {
  try {
    const { adminId, newAdminId } = req.body;

    // Comprobar que el ADMIN pertenece a una protectora.
    if (!req.user.shelterId) return res.status(400).json({ message: "No perteneces a ninguna protectora." });

    // Comprobar que el ADMIN es propietario de la protectora.
    if (!req.user.isAdminOwner) return res.status(403).json({ message: "Solo el propietario de la protectora puede eliminar administradores." });

    // Comprobar que existe el ADMIN que se quiere eliminar.
    const adminToRemove = await prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!adminToRemove) return res.status(404).json({ message: "Administrador no encontrado." });

    // Comprobar que el ADMIN que se quiere eliminar pertenece a la misma protectora.
    if (adminToRemove.shelterId !== req.user.shelterId) return res.status(403).json({ message: "Este usuario no pertenece a tu protectora." });

    // Comprobar que el usuario a eliminar es ADMIN.
    if (adminToRemove.role !== "ADMIN") return res.status(400).json({ message: "El usuario no es administrador." });

    // El propietario no puede eliminarse a sí mismo.
    if (adminToRemove.id === req.user.id) return res.status(400).json({ message: "No puedes eliminarte a ti mismo como propietario." });

    // Buscar solicitudes activas asignadas a este admin (NO IMPLEMENTADO FINALMENTE).
    const pendingRequests = await prisma.adoptionRequest.findMany({
      where: { adminId: adminId, status: { in: ["PENDING", "APPROVED"] } }
    });

    // Si tiene solicitudes activas y NO se indica reasignación da error. (NO IMPLEMENTADO FINALMENTE).
    if (pendingRequests.length > 0 && !newAdminId) {
      return res.status(400).json({
        message: "Este administrador tiene solicitudes activas. Debes reasignarlas antes de eliminarlo."
      });
    }

    // Reasignar solicitudes si newAdminId existe. (NO IMPLEMENTADO FINALMENTE).
    if (newAdminId) {
      await prisma.adoptionRequest.updateMany({
        where: { adminId: adminId, status: { in: ["PENDING", "APPROVED"] } },
        data: { adminId: newAdminId }
      });
    }

    // Quitar el rol y desvincular de la protectora.
    await prisma.user.update({
      where: { id: adminId },
      data: {
        role: "USER",
        shelterId: null,
        isAdminOwner: false,
      },
    });

    res.status(200).json({ message: "Administrador eliminado correctamente." });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible eliminar el administrador.", error });
  }
};
