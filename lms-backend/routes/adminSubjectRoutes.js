// routes/adminSubjectRoutes.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import auth from '../middleware/auth.js';
import {
  createSubject,
  getAllSubjects,
  updateSubject,
  deleteSubject,
  // chapters
  addChapter,
  getChapters,
  deleteChapter,
  updateChapter,
  streamChapterPdf,
  streamChapterVideo,
  linkChapterTest,
  unlinkChapterTest,
  addChapterTopic,
  listChapterTopics,
  updateChapterTopic,
  deleteChapterTopic,  
  linkChapterPractice,
  unlinkChapterPractice,
  linkSubjectTests,
  unlinkSubjectTest
} from '../controllers/adminsubjectsController.js';

const router = express.Router();

//1.=======Admin add subject route=========*
router.post('/create', auth, createSubject);

//2.=======Admin fetch all subjects route=========*
router.get('/Allsubjects', auth, getAllSubjects);

//3.=======Admin edits a subject route=========*
router.patch('/update/:subjectId', auth, updateSubject);

//4.=======Admin deletes a subject route=========*
router.delete('/delete/:subjectId', auth, deleteSubject);

/* -------------------- uploads for chapters (multer) -------------- */
const uploadRoot = path.join(process.cwd(), 'uploads', 'chapters');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const base = path.parse(file.originalname).name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
    cb(null, `${ts}_${base}${path.extname(file.originalname)}`);
  },
});

// allow PDFs and common video types
const fileFilter = (_req, file, cb) => {
  const ok = /\.(pdf|dox|mp4|webm|ogg|mov|avi|mkv|m4v)$/i.test(file.originalname);
  cb(ok ? null : new Error('Only PDF and video files are allowed'), ok);
};

const chapterUpload = multer({ storage, fileFilter });

/* -------------------- chapter routes ----------------------------- */
// 5) create a chapter for a subject
router.post(
  '/:subjectId/chapter/create',
  auth,
  chapterUpload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  addChapter
);

// 6) get all chapters of a subject
router.get('/:subjectId/Allchapters', auth, getChapters);

// 7) delete a chapter from a subject
router.delete('/:subjectId/delete-chapter/:chapterId', auth, deleteChapter);

// 8) edit/update a chapter (name/description, optional file replace)
router.patch(
  '/:subjectId/edit-chapter/:chapterId',
  auth,
  chapterUpload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
  updateChapter
);

// 9)-------------------- Public chapter PDF (no auth) --------------------
router.get('/public/:subjectId/chapter/:chapterId/pdf', streamChapterPdf);

// 10)-------------------- Public chapter video (no auth) --------------------
router.get('/public/:subjectId/chapter/:chapterId/video', streamChapterVideo);


// 11) Link a single test to a chapter
router.patch('/:subjectId/chapter/:chapterId/link-test', auth, linkChapterTest);

// 12) Unlink test from a chapter
router.patch('/:subjectId/chapter/:chapterId/unlink-test', auth, unlinkChapterTest);

// ---------------- TOPICS (Admin) ----------------
// 13) Create topic
router.post('/:subjectId/chapter/:chapterId/topic', auth, addChapterTopic);

// 14) List topics in a chapter
router.get('/:subjectId/chapter/:chapterId/alltopics', auth, listChapterTopics);

// 15) Update a topic
router.patch('/:subjectId/chapter/:chapterId/update-topic/:topicId', auth, updateChapterTopic);

// 16) Delete a topic
router.delete('/:subjectId/chapter/:chapterId/delete-topic/:topicId', auth, deleteChapterTopic);


//practice routes
// 17) Link a practice test to a chapter (single-selection)
router.patch('/:subjectId/chapter/:chapterId/link-practice', auth, linkChapterPractice);

// 18) Link a practice test to a chapter (single-selection)
router.patch('/:subjectId/chapter/:chapterId/unlink-practice', auth, unlinkChapterPractice);

// 19) Link a subject test to a subject (multiple-selection)
router.patch('/:subjectId/link-subject-tests', auth, linkSubjectTests);

// 20) Unlink a subject test from a subject 
router.patch('/:subjectId/unlink-subject-test', auth, unlinkSubjectTest);


export default router;
