// routes/adminSubjecttestRoutes.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import auth from '../middleware/auth.js';
import {
  uploadSubjectTest,
  getAllSubjectTests,
  deleteSubjectTest,
  previewSubjectTest,
  downloadSubjectTestFile,
} from '../controllers/adminSubjecttestcontroller.js';

const router = Router();

// __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local folder: uploads/subject-tests
const uploadRoot = path.join(__dirname, '..', 'uploads', 'subject-tests');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

// Only excel files
const fileFilter = (_req, file, cb) => {
  const ok = /\.(xlsx|xls)$/i.test(file.originalname);
  cb(ok ? null : new Error('Only .xlsx/.xls allowed'), ok);
};

// disk storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const base = path.parse(file.originalname).name.replace(/\s+/g, '_');
    cb(null, `${ts}_${base}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage, fileFilter });

// Base (mount in server.js): /api/admin/subject-test

// 1) Upload subject test
router.post('/upload-subtest', auth, upload.single('file'), uploadSubjectTest);

// 2) Get all subject tests
router.get('/allsubtests', auth, getAllSubjectTests);

// 3) Delete subject test
router.delete('/deletesubtest/:id', auth, deleteSubjectTest);

// 4) Preview subject test
router.get('/previewsubtest/:id', auth, previewSubjectTest);

// 5) Download subject test file
router.get('/downloadsubtest/:id', auth, downloadSubjectTestFile);

export default router;
