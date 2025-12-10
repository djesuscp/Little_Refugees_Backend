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
//app.use(cors());
const allowedOrigins = [
  "https://little-refugees-frontend.onrender.com",
  "http://localhost:4200"
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// MUY IMPORTANTE: manejar el preflight OPTIONS
app.options("*", cors());
app.use(express.json());

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/adoptions", adoptionRequestRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
