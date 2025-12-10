import express, { NextFunction } from "express";
import { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import animalRoutes from "./routes/animalRoutes";
import photoRoutes from "./routes/photoRoutes";
import shelterRoutes from "./routes/shelterRoutes";
import adoptionRequestRoutes from "./routes/adoptionRequestRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();

// 1️⃣ CORS GLOBAL
app.use(cors({
  origin: "https://little-refugees-frontend.onrender.com",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// 2️⃣ Manejo AUTOMÁTICO para todos los preflight
app.use((req: any, res: any, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 3️⃣ JSON parser
app.use(express.json());

// 4️⃣ Rutas
app.use("/api/auth", authRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/adoptions", adoptionRequestRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
