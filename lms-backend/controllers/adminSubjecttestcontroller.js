// controllers/adminSubjecttestcontroller.js
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import SubjectTest from '../models/SubjectTest.js';

// ---------- helpers ----------
function readWorkbook(localPath) {
  const buf = fssync.readFileSync(localPath);
  return xlsx.read(buf, { type: 'buffer' });
}
function getFirstSheet(wb) {
  const name = wb.SheetNames[0];
  return wb.Sheets[name];
}
function toRows(sheet) {
  // header:1 -> array-of-arrays; defval:null keeps empty cells as null
  return xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
}
function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// Excel contract (subject-test):
// Row 1: [Question, Option1, Option2, Option3, Option4, CorrectAnswer, Duration, TotalQ, Passing%]
// Row 2..N: question rows; meta fields (Duration, TotalQ, Passing%) usually row 2, cols 7..9
function extractMetaAndQuestions(sheet) {
  const rows = toRows(sheet);
  const metaRow = rows[1] || []; // second row (index 1)
  const duration = toInt(metaRow[6], 0);
  const totalQuestionCount = toInt(metaRow[7], 0);
  const passingPercentage = toInt(metaRow[8], 0);

  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const [Q, A, B, C, D, Ans] = r;
    if (!Q) continue; // skip blanks
    questions.push({
      Question: String(Q ?? ''),
      A: A ?? '',
      B: B ?? '',
      C: C ?? '',
      D: D ?? '',
      Answer: Ans ?? '',
    });
  }

  // In case excel TotalQ mismatch, prefer actual parsed count but don't break contract
  const effectiveTotal = questions.length || totalQuestionCount;

  return { duration, totalQuestionCount: effectiveTotal, passingPercentage, questions };
}

// ---------- controllers ----------

// 1) Upload subject test (expects multer to set req.file; field name: 'file')
export const uploadSubjectTest = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Build title from original filename (no extension)
    const originalName = req.file.originalname || 'subject_test';
    const title = path.parse(originalName).name;

    // Where route stores the file: /uploads/subject-tests/<filename>
    // -> req.file.path = absolute local path (multer), req.file.filename = stored name
    const localPath = req.file.path;
    const filePath = `/uploads/subject-tests/${req.file.filename}`;

    // Parse excel
    const wb = readWorkbook(localPath);
    const sheet = getFirstSheet(wb);
    const { duration, totalQuestionCount, passingPercentage, questions } =
      extractMetaAndQuestions(sheet);

    // Save in DB
    const doc = await SubjectTest.create({
      title,
      filePath,
      localPath,
      duration,
      totalQuestionCount,
      passingPercentage,
      questions,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Error uploading subject test:', err);
    res.status(500).json({ message: 'Failed to upload subject test', error: err.message });
  }
};

// 2) List all subject tests
export const getAllSubjectTests = async (req, res) => {
  try {
    const tests = await SubjectTest.find().sort({ createdAt: -1 });
    res.status(200).json(tests);
  } catch (err) {
    console.error('Error fetching subject tests:', err);
    res.status(500).json({ message: 'Failed to fetch subject tests', error: err.message });
  }
};

// 3) Preview a subject test (returns parsed questions JSON)
export const previewSubjectTest = async (req, res) => {
  try {
    const test = await SubjectTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Subject test not found' });

    const wb = readWorkbook(test.localPath);
    const sheet = getFirstSheet(wb);
    const { questions } = extractMetaAndQuestions(sheet);

    res.status(200).json({
      testTitle: test.title,
      questions,
    });
  } catch (err) {
    console.error('Error previewing subject test:', err);
    res.status(500).json({ message: 'Failed to preview subject test', error: err.message });
  }
};

// 4) Download original file
export const downloadSubjectTestFile = async (req, res) => {
  try {
    const test = await SubjectTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Subject test not found' });

    res.download(test.localPath, path.basename(test.localPath));
  } catch (err) {
    console.error('Error downloading subject test:', err);
    res.status(500).json({ message: 'Failed to download subject test', error: err.message });
  }
};

// 5) Delete subject test (unlink file + remove doc)
export const deleteSubjectTest = async (req, res) => {
  try {
    const test = await SubjectTest.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Subject test not found' });

    try {
      if (fssync.existsSync(test.localPath)) {
        await fs.unlink(test.localPath);
      }
    } catch (e) {
      // log but continue (we still want to delete DB record)
      console.warn('Warning: failed to remove file from disk:', e?.message || e);
    }

    await SubjectTest.deleteOne({ _id: test._id });
    res.status(200).json({ message: 'Subject test deleted successfully' });
  } catch (err) {
    console.error('Error deleting subject test:', err);
    res.status(500).json({ message: 'Failed to delete subject test', error: err.message });
  }
};
