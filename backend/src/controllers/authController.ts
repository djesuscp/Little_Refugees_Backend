import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client";
import { AuthRequest } from "../middlewares/authentication";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Registrar usuario.
export const register = async (req: Request, res: Response) => {
  const { fullName, email, password } = req.body;

  // Comprobar si se han proporcionado los campos obligatorios para el registro.
  if (!fullName || !email || !password) return res.status(400).json({ message: "Faltan campos obligatorios." });

  // Verificar email único (User and Shelter).
const existingUser = await prisma.user.findUnique({ where: { email } });
if (existingUser)
  return res.status(400).json({ message: "El email ya está registrado por otro usuario." });

const existingShelter = await prisma.shelter.findUnique({ where: { email } });
if (existingShelter)
  return res.status(400).json({ message: "El email ya está asignado a una protectora." });


  // Encriptar contraseña.
  const hashed = await bcrypt.hash(password, 10);

  // Crear usuario.
  const user = await prisma.user.create({
    data: { fullName, email, password: hashed, role: "USER" },
  });

  res.status(201).json({ message: "Usuario registrado correctamente.", user });
};

// Login de usuario.
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Comprobar si el email proporcionado es válido.
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: "Credenciales inválidas." });

  // Comprobar si la contraseña proporcionada es válida.
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Credenciales inválidas." });

  // Generar token de inicio de sesión.
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, isAdminOwner: user.isAdminOwner, shelterId: user.shelterId, firstLoginCompleted: user.firstLoginCompleted },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.status(200).json({message: "Inicio de sesión correcto.", token, user: { id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isAdminOwner: user.isAdminOwner,
    shelterId: user.shelterId,
    firstLoginCompleted: user.firstLoginCompleted }
  });
};

// Refrescar usuario.
export const me = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;

    if (!authUser) {
      return res.status(401).json({ message: "No autorizado." });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isAdminOwner: true,
        shelterId: true,
        firstLoginCompleted: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    return res.json({ user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error interno del servidor.", error });
  }
};

// Gestionar primer inicio de sesión.
export const completeFirstLogin = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado." });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { firstLoginCompleted: true }
    });

    return res.json({
      message: "Primer login completado.",
      user: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        role: updated.role,
        isAdminOwner: updated.isAdminOwner,
        firstLoginCompleted: updated.firstLoginCompleted
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor." });
  }
};

