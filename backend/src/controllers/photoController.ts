import { Request, Response } from "express";
import prisma from "../prisma/client";
import { AuthRequest } from "../middlewares/authentication";

// Crear una foto (role == ADMIN).
export const createPhoto = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar que el usuario sea ADMIN.
    if (!req.user || req.user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    // Recibir id de animal y url.
    const { animalId, url } = req.body;

    // Comprobar que se ha proporcionado la URL de la fotografía.
    if (!url) return res.status(400).json({ message: "Falta la URL de la foto." });

    // Obtener animal.
    const animal = await prisma.animal.findUnique({
      where: { id: Number(animalId) },
    });

    // Respuesta si no se ha encontrado el animal.
    if (!animal) return res.status(404).json({ message: "Animal no encontrado." });

    // Evitar que se agreguen fotos a los animales de otra protectora.
    if (animal.shelterId !== req.user.shelterId) return res.status(403).json({ message: "No puedes agregar fotos a animales de otra protectora." });

    // Crear fotografía.
    const photo = await prisma.photo.create({
      data: { animalId: Number(animalId), url },
    });

    res.status(201).json({ message: "Fotografía creada correctamente.", photo });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible crear la fotografía.", error });
  }
};

// Obtener fotos de un animal.
export const getPhotosByAnimal = async (req: Request, res: Response) => {
  try {
    const { animalId } = req.params;

    // Obtener fotografías.
    const photos = await prisma.photo.findMany({
      where: { animalId: Number(animalId) },
    });

    res.status(200).json({ message: "Fotografías obtenidas.", photos });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible obtener las fotografías.", error });
  }
};

// Eliminar foto (solo ADMIN de la protectora).
export const deletePhoto = async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user;
    const { id } = req.params;

    // Comprobar si el usuario es ADMIN.
    if (user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    // Obtener fotografía.
    const photo = await prisma.photo.findUnique({
      where: { id: Number(id) },
      include: { animal: true },
    });

    // Respuesta si la fotografía no se ha encontrado.
    if (!photo) return res.status(404).json({ message: "Foto no encontrada." });

    // Evitar que el ADMIN pueda eliminar fotografías de animales pertenecientes a otras protectoras.
    if (photo.animal.shelterId !== user.shelterId) return res.status(403).json({ message: "No puedes eliminar fotos de animales de otra protectora." });

    // Eliminar fotografía.
    await prisma.photo.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Foto eliminada correctamente." });
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor. No ha sido posible eliminar la fotografía.", error });
  }
};


