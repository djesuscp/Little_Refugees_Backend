//import express from "express";
//import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import animalRoutes from "./routes/animalRoutes";
import photoRoutes from "./routes/photoRoutes";
import shelterRoutes from "./routes/shelterRoutes";
import adoptionRequestRoutes from "./routes/adoptionRequestRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const express = require('express');
const cors = require('cors');
const app = express();

//const app = express();
app.use(cors());
app.use(express.json());

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/adoptions", adoptionRequestRoutes);
app.use("/api/users", userRoutes);

// app.get('/products/:id', function (req, res, next) {
//   res.json({msg: 'This is CORS-enabled for all origins!'})
// })

app.listen(80, function () {
  console.log('CORS-enabled web server listening on port 80')
})

//const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
