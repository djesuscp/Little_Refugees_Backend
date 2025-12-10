import { Request, Response } from "express";
import prisma from "../prisma/client";
import { AuthRequest } from "../middlewares/authentication";
import { empty } from "@prisma/client/runtime/library";

// Crear una solicitud de adopción (role == USER).
export const createAdoptionRequest = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar si quien envía la solicitud es USER.
    if (!req.user || req.user.role !== "USER") return res.status(403).json({ message: "Solo los usuarios pueden enviar solicitudes." });

    const { animalId, message } = req.body;

    // Comprobar si se ha proporcionado el id del animal.
    if (!animalId) return res.status(400).json({ message: "animalId es obligatorio." });

    // Comprobar si se ha proporcionado el mensaje.
    if (!message) return res.status(400).json({ message: "El mensaje es obligatorio." });

    // Verificar que el animal existe y no esté adoptado.
    const animal = await prisma.animal.findUnique({ where: { id: Number(animalId) } });
    if (!animal) return res.status(404).json({ message: "Animal no encontrado." });
    if (animal.adopted) return res.status(400).json({ message: "Este animal ya ha sido adoptado.",
      animal: {
        name: animal.name,
        species: animal.species,
        breed: animal.species,
        description: animal.description }});

    // Verificar que no haya una solicitud previa del mismo usuario para ese animal.
    const existingRequest = await prisma.adoptionRequest.findFirst({
      where: { userId: req.user.id, animalId: Number(animalId) },
    });
    if (existingRequest) return res.status(400).json({ message: "Ya has enviado una solicitud para este animal" });

    // Crear solicitud de adopción.
    const request = await prisma.adoptionRequest.create({
      data: {
        userId: req.user.id,
        animalId: Number(animalId),
        message
      },
      include: { animal: true, user: true },
    });

    res.status(201).json({
      message: "Solicitud enviada correctamente.",
      request,
    });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible crear su solicitud.", error });
  }
};

// Obtener solicitudes del usuario autenticado (role == USER).
export const getMyRequests = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar que el usuario está autorizado.
    if (!req.user) return res.status(401).json({ message: "No autorizado." });

    // Filtros.
    const { status, orderBy, direction = "desc" } = req.query;

    const filters: any = {
      userId: req.user.id,
    };

    // Filtro por estado (puede recibir uno o varios: "PENDING", "APPROVED", "REJECTED").
    if (status) {
      const statusArray = Array.isArray(status)
        ? status
        : String(status).split(",");

      filters.status = { in: statusArray };
    }

    // Ordenación (solo por fecha de creación).
    const sort: any = {};
    if (orderBy === "createdAt") {
      sort.createdAt = direction === "asc" ? "asc" : "desc";
    } else {
      // Ordenado desc por defecto.
      sort.createdAt = "desc";
    }

    const requests = await prisma.adoptionRequest.findMany({
      where: filters,
      include: {
        animal: {
          include: {
            photos: true,
            shelter: {
              select: {
                name: true,
                email: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: sort,
    });

    // Comprobar si hay solicitudes.
    if (requests.length === 0) {
      return res.status(200).json({ message: "Aún no has creado ninguna solicitud." });
    }

    res.status(200).json({ message: "Solicitudes obtenidas: ", requests });
  } catch (error) {
    res.status(500).json({
      message: "Error interno del servidor. No ha sido posible obtener las solicitudes.",
      error,
    });
  }
};

// Obtener todas las solicitudes de la protectora (role == ADMIN).
export const getRequestsForShelter = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar que el usuario sea ADMIN.
    if (!req.user || req.user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    const admin = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Comprobar que el ADMIN está asociado a una protectora.
    if (!admin?.shelterId) return res.status(400).json({ message: "El administrador no tiene una protectora asociada." });

    // Filtros.
    const {
      status,
      orderBy,
      direction = "desc",
      animalName,
      userName,
      page = "1",
      limit = "10",
    } = req.query;

    const filters: any = {
      animal: { shelterId: admin.shelterId }, // Solicitudes de animales de esta protectora.
    };

    const AND: any[] = [];

    // Filtro por estado (uno o varios).
    if (status) {
      const statusArray = Array.isArray(status)
        ? status
        : String(status).split(",");

      AND.push({ status: { in: statusArray } });
    }

    // Filtro por nombre del ANIMAL (parcial, insensitive).
    if (animalName) {
      AND.push({
        animal: {
          name: {
            contains: String(animalName),
            mode: "insensitive",
          },
        },
      });
    }

    // Filtro por nombre del USUARIO solicitante (parcial, insensitive).
    if (userName) {
      AND.push({
        user: {
          fullName: {
            contains: String(userName),
            mode: "insensitive",
          },
        },
      });
    }

    // Aplicar filtros compuestos.
    if (AND.length > 0) filters.AND = AND;

    // Ordenación (solo por fecha de creación).
    const sort: any = {};
    if (orderBy === "createdAt") {
      sort.createdAt = direction === "asc" ? "asc" : "desc";
    } else {
      sort.createdAt = "desc";
    }

    // Paginación.
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Obtener solicitudes de la protectora.
    const requests = await prisma.adoptionRequest.findMany({
      where: filters,
      select: {
        // Datos de la solicitud.
        id: true,
        message: true,
        status: true,
        userId: true,
        animalId: true,
        createdAt: true,

        // Datos del animal.
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            gender: true,
            age: true,
            description: true,
            adopted: true,
            photos: { select: { url: true } },
          },
        },

        // Datos del usuario que envió la solicitud.
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: sort,
    });

    // Total para paginación.
    const total = await prisma.adoptionRequest.count({ where: filters });

    res.status(200).json({
      message: "Solicitudes obtenidas: ",
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      requests,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error interno del servidor. No ha sido posible obtener las solicitudes.",
      error,
    });
  }
};

// Obtener una solicitud de adopción por ID (role == ADMIN).
export const getRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Comprobar que el usuario sea ADMIN.
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado." });
    }

    // Comprobar que el ADMIN está asociado a una protectora.
    const admin = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!admin?.shelterId) {
      return res
        .status(400)
        .json({ message: "El administrador no tiene una protectora asociada." });
    }

    // Primero obtener la solicitud con el shelterId del animal para validar acceso.
    const requestForCheck = await prisma.adoptionRequest.findUnique({
      where: { id: Number(id) },
      include: {
        animal: {
          select: {
            shelterId: true,
          },
        },
      },
    });

    // Comprobar que la solicitud existe.
    if (!requestForCheck) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    // Comprobar que la solicitud pertenece a la protectora del admin.
    if (requestForCheck.animal.shelterId !== admin.shelterId) {
      return res
        .status(403)
        .json({ message: "No puedes ver solicitudes de otra protectora." });
    }

    // Obtener la solicitud con los datos requeridos.
    const request = await prisma.adoptionRequest.findUnique({
      where: { id: Number(id) },
      select: {
        // Datos de la solicitud.
        id: true,
        message: true,
        status: true,
        userId: true,
        animalId: true,
        createdAt: true,

        // Datos del animal.
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            gender: true,
            age: true,
            description: true,
            adopted: true,
            photos: { select: { url: true } },
          },
        },

        // Datos del usuario que envió la solicitud.
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    res.status(200).json({ message: "Solicitud obtenida.", request });
  } catch (error) {
    res.status(500).json({
      message:
        "Error interno del servidor. No ha sido posible obtener la solicitud.",
      error,
    });
  }
};

// Actualizar estado de una solicitud (role == ADMIN).
export const updateRequestStatus = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar que el usuario sea ADMIN.
    if (!req.user || req.user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["PENDING", "APPROVED", "REJECTED"];

    // Comprobar el estado recibido.
    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Estado inválido." });

    const request = await prisma.adoptionRequest.findUnique({
      where: { id: Number(id) },
      include: { animal: true },
    });

    // Comprobar si la solicitud existe.
    if (!request) return res.status(404).json({ message: "Solicitud no encontrada." });

    const admin = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Evitar que el admin pueda modificar solicitudes de otras protectoras.
    if (admin?.shelterId !== request.animal.shelterId) return res.status(403).json({ message: "No puedes modificar solicitudes de otras protectoras." });

    // Actualizar estado de la solicitud.
    const updatedRequest = await prisma.adoptionRequest.update({
      where: { id: Number(id) },
      data: { status },
    });

    // Antes de aprobar, comprobar si ya existe otra solicitud aprobada para este animal.
    if (status === "APPROVED") {
      const existingApproved = await prisma.adoptionRequest.findFirst({
        where: {
          animalId: request.animalId,
          status: "APPROVED",
          NOT: { id: request.id }, // No se tiene en cuenta la misma solicitud.
        },
      });

      if (existingApproved) {
        return res.status(400).json({
          message:
            "Este animal ya tiene una solicitud aprobada. No se pueden aprobar más solicitudes.",
        });
      }
    }

    // Si la solicitud ha sido aprobada, se marca al animal como "Adoptado".
    if (status === "APPROVED") {
      await prisma.animal.update({
        where: { id: request.animalId },
        data: { adopted: true },
      });
    }

    if (status === "PENDING" || status === "REJECTED") {
      await prisma.animal.update({
        where: { id: request.animalId },
        data: { adopted: false },
      });
    }

    res.status(200).json({ message: "Solicitud modificada correctamente.", updatedRequest });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible actualizar la solicitud.", error });
  }
};

// Eliminar una solicitud (role == ADMIN).
export const deleteAdoptionRequest = async (req: AuthRequest, res: Response) => {
  try {
    const requestId = Number(req.params.id);

    const user = req.user;

    // Comprobar que el usuario es ADMIN.
    if (user.role !== "ADMIN") return res.status(403).json({ message: "Solo los administradores pueden eliminar solicitudes." });

    // Obtener solicitud.
    const adoptionRequest = await prisma.adoptionRequest.findUnique({
      where: { id: requestId },
      include: {
        animal: true
      }
    });

    // Comprobar que la solicitud existe.
    if (!adoptionRequest) return res.status(404).json({ message: "Solicitud no encontrada." });

    // Comprobar que la solicitud pertenece a la protectora del admin.
    if (adoptionRequest.animal.shelterId !== user.shelterId) return res.status(403).json({ message: "No puedes eliminar solicitudes de otra protectora." });

    // Eliminar solicitud.
    await prisma.adoptionRequest.delete({
      where: { id: requestId }
    });

    return res.status(200).json({ message: "Solicitud eliminada correctamente." });
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor. No ha sido posible eliminar la solicitud.", error});
  }
};
