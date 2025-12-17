// routes/testRoutes.js
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import auth from '../middleware/auth.js';
import {
  uploadTest,
  getAllTests,
  deleteTest,
  previewTest,
  downloadTestFile,
} from '../controllers/admintestController.js';

const router = Router();

// __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local folder: uploads/tests
const uploadRoot = path.join(__dirname, '..', 'uploads', 'tests');
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

// for all of these routes the base of endpoint is /api/admin-tests/...
//1.========Admin uploads a test route =============*
router.post('/upload-test', auth, upload.single('file'), uploadTest);

//2.========Admin fetch all tests route =============*
router.get('/alltests', auth, getAllTests);

//3.========Admin deletes a test route =============*
router.delete('/delete/:id', auth, deleteTest);

//4.========Admin fetch a single test route =============*
router.get('/preview/:id', auth, previewTest);

//5.========Admin downloads a test route =============*
router.get('/download/:id', auth, downloadTestFile);

export default router;
