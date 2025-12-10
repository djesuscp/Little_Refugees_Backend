import { Response } from 'express';
import cloudinary from '../config/cloudinary';
import prisma from '../prisma/client';
import { AuthRequest } from '../middlewares/authentication';

/**
 * POST /api/animals/admin/:id/photos
 * Sube nuevas fotos a Cloudinary y las asocia al animal.
 * Body: multipart/form-data con campo "photos" (array de archivos).
 */
export const uploadAnimalPhotosController = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const { id } = req.params;
    const animalId = Number(id);
    if (isNaN(animalId)) {
      return res.status(400).json({ message: 'ID de animal inválido.' });
    }

    // Comprobar que el animal existe y pertenece a la protectora del admin
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
    });

    if (!animal) {
      return res.status(404).json({ message: 'Animal no encontrado.' });
    }

    if (animal.shelterId !== admin.shelterId) {
      return res.status(403).json({ message: 'No puedes gestionar fotos de animales de otra protectora.' });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No se ha enviado ninguna foto.' });
    }

    // Comprobar cuántas fotos tiene ya este animal
    const existingCount = await prisma.photo.count({
      where: { animalId },
    });

    if (existingCount + files.length > 5) {
      return res.status(400).json({
        message: 'Solo se permiten un máximo de 5 fotos por animal.',
      });
    }

    const createdPhotos = [];

    for (const file of files) {
      // Subir a Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `little_refugees/animals/${animalId}`,
      });

      // Guardar en BD
      const photo = await prisma.photo.create({
        data: {
          id: result.id,
          url: result.secure_url,
          publicId: result.public_id,
          animalId,
        },
      });

      createdPhotos.push(photo);
    }

    return res.status(201).json({
      message: 'Fotos subidas correctamente.',
      photos: createdPhotos,
    });
  } catch (error) {
    console.error('Error al subir fotos de animal:', error);
    return res.status(500).json({
      message: 'Error interno del servidor. No se pudieron subir las fotos.',
      error,
    });
  }
};

/**
 * DELETE /api/animals/admin/:animalId/photos/:photoId
 * Elimina una foto concreta (Cloudinary + BD).
 */
export const deleteAnimalPhotoController = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const { animalId, photoId } = req.params;
    const aId = Number(animalId);
    const pId = Number(photoId);

    if (isNaN(aId) || isNaN(pId)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    // Buscar la foto y el animal
    const photo = await prisma.photo.findUnique({
      where: { id: pId },
      include: { animal: true },
    });

    if (!photo || !photo.animal) {
      return res.status(404).json({ message: 'Foto no encontrada.' });
    }

    if (photo.animal.id !== aId) {
      return res.status(400).json({ message: 'La foto no pertenece a este animal.' });
    }

    if (photo.animal.shelterId !== admin.shelterId) {
      return res.status(403).json({ message: 'No puedes eliminar fotos de animales de otra protectora.' });
    }

    // Eliminar en Cloudinary (si tiene publicId)
    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId);
    }

    // Eliminar en BD
    await prisma.photo.delete({ where: { id: pId } });

    return res.status(200).json({ message: 'Foto eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar foto de animal:', error);
    return res.status(500).json({
      message: 'Error interno del servidor. No se pudo eliminar la foto.',
      error,
    });
  }
};

/**
 * DELETE /api/animals/admin/:animalId/photos
 * Elimina TODAS las fotos del animal (útil al borrar el animal).
 */
export const deleteAllAnimalPhotosController = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    const { animalId } = req.params;
    const aId = Number(animalId);

    if (isNaN(aId)) {
      return res.status(400).json({ message: 'ID de animal inválido.' });
    }

    const animal = await prisma.animal.findUnique({
      where: { id: aId },
    });

    if (!animal) {
      return res.status(404).json({ message: 'Animal no encontrado.' });
    }

    if (animal.shelterId !== admin.shelterId) {
      return res.status(403).json({ message: 'No puedes eliminar fotos de animales de otra protectora.' });
    }

    const photos = await prisma.photo.findMany({
      where: { animalId: aId },
    });

    // Borrar recursos en Cloudinary
    const publicIds = photos
      .map(p => p.publicId)
      .filter((id): id is string => !!id);

    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    // Borrar en BD
    await prisma.photo.deleteMany({ where: { animalId: aId } });

    // Borrar carpeta en Cloudinary (opcional, pero es lo que querías)
    await cloudinary.api.delete_folder(`little_refugees/animals/${aId}`);

    return res.status(200).json({ message: 'Todas las fotos del animal han sido eliminadas.' });
  } catch (error) {
    console.error('Error al eliminar todas las fotos de un animal:', error);
    return res.status(500).json({
      message: 'Error interno del servidor. No se pudieron eliminar las fotos.',
      error,
    });
  }
};

// 👉 NUEVO: obtener solo las fotos de un animal (solo ADMIN de esa protectora)
export const getAnimalPhotos = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Comprobar autenticación y rol
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado." });
    }

    const animalId = Number(id);
    if (Number.isNaN(animalId)) {
      return res.status(400).json({ message: "ID de animal inválido." });
    }

    // Comprobar que el animal exista y pertenezca a la protectora del admin
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true, shelterId: true },
    });

    if (!animal) {
      return res.status(404).json({ message: "Animal no encontrado." });
    }

    if (animal.shelterId !== req.user.shelterId) {
      return res.status(403).json({
        message: "No puedes acceder a las fotos de animales de otra protectora.",
      });
    }

    // Obtener fotos del animal
    const photos = await prisma.photo.findMany({
      where: { animalId },
      select: {
        id: true,
        url: true,
        publicId: true,
        animalId: true,
      },
    });

    return res.status(200).json({
      message: "Fotos obtenidas correctamente.",
      photos,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener las fotos del animal.",
      error,
    });
  }
};
