import { Request, Response } from "express";
import prisma from "../prisma/client";
import { AuthRequest } from "../middlewares/authentication";
import cloudinary from "../config/cloudinary";

// Crear animal (role == ADMIN).
export const createAnimal = async (req: any, res: Response) => {
  try {
    // Comprobar que el usuario es ADMIN.
    if (req.user.role !== "ADMIN") return res.status(403).json({ message: "No autorizado." });

    // Comprobar que el ADMIN está asociado a una protectora.
    if (!req.user.shelterId) return res.status(400).json({ message: "No estás asociado a una protectora." });

    const { name, species, breed, gender, age, description } = req.body;

    // Comprobar que se han proporcionado los campos obligatorios.
    if (!name || !species || !breed || !gender) return res.status(400).json({ message: "Nombre, especie, raza y género son obligatorios." });

    // Crear animal.
    const animal = await prisma.animal.create({
      data: {
        name,
        species,
        breed,
        gender,
        age: age ? Number(age) : null,
        description,
        shelterId: req.user.shelterId,
      },
    });

    res.status(201).json({ message: "Animal creado correctamente.", animal });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible crear el animal.", error });
  }
};

// Obtener todos los animales (role == USER).
export const getAllAnimalsForUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Comprobar que el usuario sea USER.
    if (!user || user.role !== "USER") { return res.status(403).json({ message: "No autorizado." }); }

    const {
      name,
      species,
      breed,
      gender,
      age_min,
      age_max,
      shelterId,
      page = "1",
      limit = "10",
      orderBy,
      direction = "asc"
    } = req.query;

    const filters: any = {
      adopted: false,
    };

    // Filtro por nombre (búsqueda parcial).
    if (name) {
      filters.name = { contains: String(name), mode: "insensitive" };
    }

    // Filtro species (array o string).
    if (species) {
      const speciesArray = Array.isArray(species)
        ? species
        : String(species).split(",");
      filters.species = { in: speciesArray };
    }

    // Filtro breed (array o string).
    if (breed) {
      const breedArray = Array.isArray(breed)
        ? breed
        : String(breed).split(",");
      filters.breed = { in: breedArray };
    }

    // Filtro gender (array o string).
    if (gender) {
      const genderArray = Array.isArray(gender)
        ? gender
        : String(gender).split(",");
      filters.gender = { in: genderArray };
    }

    // Filtro por rango de edad.
    if (age_min || age_max) {
      filters.age = {};
      if (age_min) filters.age.gte = Number(age_min);
      if (age_max) filters.age.lte = Number(age_max);
    }

    // Filtro por protectora.
    if (shelterId) {
      filters.shelterId = Number(shelterId);
    }

    // Paginación.
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Ordenación
    const sort: any = {};

    if (orderBy === "age") {
      sort.age = direction === "desc" ? "desc" : "asc";
    } else if (orderBy === "createdAt") {                      
      sort.createdAt = direction === "desc" ? "desc" : "asc";  
    } else if (orderBy === "updatedAt") {                      
      sort.updatedAt = direction === "desc" ? "desc" : "asc";
    } else {
      // Orden por defecto: más recientes primero.
      sort.updatedAt = "asc";                             
    }

    // Consulta a BD
    const animals = await prisma.animal.findMany({
      where: filters,
      select: {
        id: true,
        name: true,
        species: true,
        breed: true,
        gender: true,
        age: true,
        description: true,
        photos: { select: { url: true } },
        shelter: {
          select: {
            name: true,
            email: true,
            address: true,
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: sort,
    });

    // Total para paginación.
    const total = await prisma.animal.count({ where: filters });

    res.status(200).json({
      message: "Animales obtenidos.",
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      animals
    });

  } catch (error) {
    res.status(500).json({
      message: "Error interno del servidor. No ha sido posible obtener los animales.",
      error,
    });
  }
};

// Obtener todos los animales (role == ADMIN).
export const getAllAnimalsForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user;

    // Comprobar que el usuario sea ADMIN.
    if (!admin || admin.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado." });
    }

    // Comprobar que el ADMIN pertenece a una protectora.
    if (!admin.shelterId) {
      return res.status(400).json({ message: "No perteneces a ninguna protectora." });
    }

    const {
      name,
      species,
      breed,
      gender,
      age_min,
      age_max,
      adopted,
      page = "1",
      limit = "10",
      orderBy,
      direction = "asc",
    } = req.query;

    const filters: any = {
      shelterId: admin.shelterId, 
    };

    // Filtro por nombre (búsqueda parcial).
    if (name) {
      filters.name = { contains: String(name), mode: "insensitive" };
    }

    // Filtro species (array o string).
    if (species) {
      const speciesArray = Array.isArray(species)
        ? species
        : String(species).split(",");
      filters.species = { in: speciesArray };
    }

    // Filtro breed (array o string).
    if (breed) {
      const breedArray = Array.isArray(breed)
        ? breed
        : String(breed).split(",");
      filters.breed = { in: breedArray };
    }

    // Filtro gender (array o string).
    if (gender) {
      const genderArray = Array.isArray(gender)
        ? gender
        : String(gender).split(",");
      filters.gender = { in: genderArray };
    }

    // Filtro por rango de edad.
    if (age_min || age_max) {
      filters.age = {};
      if (age_min) filters.age.gte = Number(age_min);
      if (age_max) filters.age.lte = Number(age_max);
    }

    // Filtro adoptado / no adoptado (opcional).
    if (adopted !== undefined) {
      filters.adopted = adopted === "true";
    }

    // Paginación
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Ordenación
    const sort: any = {};

    if (orderBy === "age") {
      sort.age = direction === "desc" ? "desc" : "asc";
    } else if (orderBy === "createdAt") {                      
      sort.createdAt = direction === "desc" ? "desc" : "asc";  
    } else if (orderBy === "updatedAt") {                      
      sort.updatedAt = direction === "desc" ? "desc" : "asc";  
    } else {
      // Orden por defecto: más recientes primero.
      sort.updatedAt = "desc";                                 
    }

    const animals = await prisma.animal.findMany({
      where: filters,
      include: { photos: true },
      skip,
      take: limitNum,
      orderBy: sort,
    });

    // Total de registros para paginación.
    const total = await prisma.animal.count({ where: filters });

    res.status(200).json({
      message: "Animales obtenidos.",
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      animals,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error interno del servidor.",
      error,
    });
  }
};

// Obtener un animal por ID (role == USER).
export const getAnimalByIdForUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Comprobar si el usuario es ADMIN.
    if (!req.user || req.user.role !== "USER") {
      return res.status(403).json({ message: "No autorizado." });
    }

    // Obtener animal por ID.
    const animal = await prisma.animal.findUnique({
      where: { id: Number(id) },
      include: { 
        photos: true,
        shelter: {
          select: {
            name: true,
            email: true,
            address: true,
            phone: true,
            description: true
          },
        },
      },
    });

    // Respuesta si no se encuentra el animal.
    if (!animal) return res.status(404).json({ message: "Animal no encontrado." });

    res.status(200).json({ message: "Animal obtenido.", animal });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible obtener el animal.", error });
  }
};

// Obtener un animal por ID (role == ADMIN).
export const getAnimalByIdForAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Comprobar si el usuario es ADMIN.
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado." });
    }

    // Obtener animal por ID (solo animal con sus fotos).
    const animal = await prisma.animal.findUnique({
      where: { id: Number(id) },
      include: { 
        photos: true,
      },
    });

    // Respuesta si no se encuentra el animal.
    if (!animal) return res.status(404).json({ message: "Animal no encontrado." });

    // Evitar que el ADMIN vea animales de otra protectora.
    if (animal.shelterId !== req.user.shelterId) {
      return res.status(403).json({ message: "No puedes ver animales de otra protectora." });
    }

    res.status(200).json({ message: "Animal obtenido.", animal });
  } catch (error) {
    res.status(500).json({ message: "Error interno del servidor. No ha sido posible obtener el animal.", error });
  }
};

// Actualizar un animal (role == ADMIN).
export const updateAnimal = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar si el usuario es ADMIN.
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "No autorizado." });
    }

    const { id } = req.params;
    const { name, species, breed, gender, age, description, adopted } = req.body;

    // Comprobar que el animal existe.
    const existingAnimal = await prisma.animal.findUnique({
      where: { id: Number(id) },
    });
    if (!existingAnimal) {
      return res.status(404).json({ message: "Animal no encontrado." });
    }

    // Evitar que el ADMIN modifique animales de otra protectora.
    if (existingAnimal.shelterId !== req.user.shelterId) {
      return res.status(403).json({
        message: "No puedes modificar animales de otra protectora.",
      });
    }

    // Construir objeto de actualización parcial.
    const updates: any = {};

    if (name) updates.name = name;
    if (species) updates.species = species;
    if (breed) updates.breed = breed;
    if (gender) updates.gender = gender;
    if (description) updates.description = description;

    // Edad puede ser "0".
    if (age !== undefined && age !== null && age !== "") {
      updates.age = Number(age);
    }

    // Adopted puede ser true/false.
    if (adopted !== undefined) {
      updates.adopted = adopted;
    }

    // Actualizar animal.
    const updatedAnimal = await prisma.animal.update({
      where: { id: Number(id) },
      data: updates,
      include: {
        photos: true
      },
    });

    res.status(200).json({
      message: "Animal actualizado correctamente.",
      animal: updatedAnimal
    });

  } catch (error) {
    res.status(500).json({
      message: "Error interno del servidor. No ha sido posible actualizar el animal.",
      error,
    });
  }
};

// Eliminar un animal (role == ADMIN).
export const deleteAnimal = async (req: AuthRequest, res: Response) => {
  try {

    // Comprobar que el usuario es ADMIN.
    const admin = req.user;
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({ message: 'No autorizado.' });
    }

    // Comprobar que el ID del animal.
    const { id } = req.params;
    const animalId = Number(id);
    if (isNaN(animalId)) {
      return res.status(400).json({ message: 'ID inválido.' });
    }

    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
    });

    // Comprobar que el animal existe.
    if (!animal) {
      return res.status(404).json({ message: 'Animal no encontrado.' });
    }

    // Evitar que se eliminen animales de otra protectora.
    if (animal.shelterId !== admin.shelterId) {
      return res.status(403).json({ message: 'No puedes eliminar animales de otra protectora.' });
    }

    // Obtener fotos del animal.
    const photos = await prisma.photo.findMany({
      where: { animalId },
    });

    const publicIds = photos
      .map(p => p.publicId)
      .filter((pid): pid is string => !!pid);

    // Si hay fotos, se borran de Cloudinary.
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    // Se borran los registros aunque no haya fotos.
    await prisma.photo.deleteMany({ where: { animalId } });

    // Se borra la carpeta, ignorando si existe o no.
    if (publicIds.length > 0) {
      try {
        await cloudinary.api.delete_folder(`little_refugees/animals/${animalId}`);
      } catch (e: any) {
        console.warn('No se pudo borrar la carpeta de Cloudinary:', e?.message);
      }
    }

    // Eliminar el animal.
    await prisma.animal.delete({ where: { id: animalId } });

    return res.status(200).json({ message: 'Animal eliminado correctamente.' });
  } catch (error) {
    return res.status(500).json({
      message: 'Error interno del servidor. No ha sido posible eliminar el animal.',
      error,
    });
  }
};