import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.join(__dirname, '../../uploads/animals');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// 👉 CREA la carpeta automáticamente si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

function fileFilter(req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Tipo de archivo no permitido. Usa JPG, JPEG, PNG o WEBP.'));
  }
  cb(null, true);
}

export const uploadAnimalPhotos = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // máximo 5 por subida
  },
  fileFilter
});
