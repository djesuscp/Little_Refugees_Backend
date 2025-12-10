import express from "express";
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

// Manejo manual del preflight (esto arregla el 404)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// CORS normal
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/adoptions", adoptionRequestRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
