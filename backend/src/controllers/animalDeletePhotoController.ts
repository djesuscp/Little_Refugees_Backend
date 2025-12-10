import { Request, Response } from "express";
import prisma from "../prisma/client";
import { AuthRequest } from "../middlewares/authentication";
import cloudinary from "../config/cloudinary";

// Eliminar un animal (role == ADMIN).

export const deleteAnimal = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const { id } = req.params;
    const animalId = Number(id);
    if (isNaN(animalId)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
    });

    if (!animal) {
      return res.status(404).json({ message: 'Animal no encontrado.' });
    }

    if (animal.shelterId !== admin.shelterId) {
      return res.status(403).json({ message: 'No puedes eliminar animales de otra protectora.' });
    }

    // 🔹 OBTENER FOTOS DEL ANIMAL
    const photos = await prisma.photo.findMany({
      where: { animalId },
    });

    const publicIds = photos
      .map(p => p.publicId)
      .filter((pid): pid is string => !!pid);

    // 🔹 SI HAY FOTOS, BORRARLAS EN CLOUDINARY
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    // 🔹 BORRAR REGISTROS DE FOTOS EN BD (FUNCIONA AUNQUE NO HAYA FOTOS)
    await prisma.photo.deleteMany({ where: { animalId } });

    // 🔹 NUEVO: solo intentamos borrar la carpeta si antes había fotos
    //    y además ignoramos el error si la carpeta no existe
    if (publicIds.length > 0) {
      try {
        await cloudinary.api.delete_folder(`little_refugees/animals/${animalId}`);
      } catch (e: any) {
        // Si quieres, puedes filtrar por código, pero normalmente
        // podemos ignorar el error si la carpeta no existe.
        // console.warn('No se pudo borrar la carpeta de Cloudinary:', e?.message);
      }
    }

    // Finalmente eliminar el animal
    await prisma.animal.delete({ where: { id: animalId } });

    return res.status(200).json({ message: 'Animal eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({
      message: 'Error interno del servidor. No ha sido posible eliminar el animal.',
      error,
    });
  }
};


// export const deleteAnimal = async (req: AuthRequest, res: Response) => {
//   try {
//     const admin = req.user;
//     if (!admin || admin.role !== 'ADMIN') {
//       return res.status(403).json({ message: 'No autorizado.' });
//     }

//     const { id } = req.params;
//     const animalId = Number(id);
//     if (isNaN(animalId)) {
//       return res.status(400).json({ message: 'ID inválido.' });
//     }

//     const animal = await prisma.animal.findUnique({
//       where: { id: animalId },
//     });

//     if (!animal) {
//       return res.status(404).json({ message: 'Animal no encontrado.' });
//     }

//     if (animal.shelterId !== admin.shelterId) {
//       return res.status(403).json({ message: 'No puedes eliminar animales de otra protectora.' });
//     }

//     // 🔹 NUEVO: eliminar fotos (Cloudinary + BD) antes de borrar el animal
//     const photos = await prisma.photo.findMany({
//       where: { animalId },
//     });

//     const publicIds = photos
//       .map(p => p.publicId)
//       .filter((pid): pid is string => !!pid);

//     if (publicIds.length > 0) {
//       await cloudinary.api.delete_resources(publicIds);
//     }

//     await prisma.photo.deleteMany({ where: { animalId } });

//     // Borrar carpeta Cloudinary del animal
//     await cloudinary.api.delete_folder(`little_refugees/animals/${animalId}`);

//     // Finalmente eliminar el animal
//     await prisma.animal.delete({ where: { id: animalId } });

//     return res.status(200).json({ message: 'Animal eliminado correctamente.' });
//   } catch (error) {
//     return res.status(500).json({
//       message: 'Error interno del servidor. No ha sido posible eliminar el animal.',
//       error,
//     });
//   }
// };
