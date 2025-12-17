// routes/adminPracticeroutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import auth from '../middleware/auth.js';
import {
  uploadPractice,
  listPractices,
  previewPractice,
  downloadPractice,
  deletePractice,
} from '../controllers/adminPracticetest.js';

const router = express.Router();

// __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ensure upload dir
const uploadDir = path.join(__dirname, '../uploads/practice');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});
const upload = multer({ storage });

// ROUTES (admin protected)
router.post('/upload', auth, upload.single('file'), uploadPractice);
router.get('/all', auth, listPractices);
router.get('/preview/:id', auth, previewPractice);
router.get('/download/:id', auth, downloadPractice);
router.delete('/delete/:id', auth, deletePractice);

export default router;
