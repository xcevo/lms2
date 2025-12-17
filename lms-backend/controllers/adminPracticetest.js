// controllers/adminPracticetest.js
import fs from 'fs/promises';
import path from 'path';
import XLSX from 'xlsx';
import Practice from '../models/practice.js';

const toTitle = (filename) =>
  String(filename || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim() || 'Practice';

// D:\lms\backend\lms-backend\controllers\adminPracticetest.js

function extractMetaAndQuestions(rows) {
  const totalCols = ['Total Number of Questions', 'Total Number of Questions.1'];
  let totalQ = 0;
  for (const r of rows) {
    for (const c of totalCols) {
      const v = Number(r?.[c]);
      if (!Number.isNaN(v) && v > 0) totalQ = Math.max(totalQ, v);
    }
  }
  if (!totalQ) totalQ = rows.length;

  const cats = Array.from(new Set(rows.map(r => String(r?.Category || '').trim()).filter(Boolean)));
  const category = cats.length === 1 ? cats[0] : (cats.length ? 'mixed' : 'general');

  const questions = [];
  for (const r of rows) {
    const question = String(r?.Question || '').trim();
    if (!question) continue;

    const options = [r?.Option1, r?.Option2, r?.Option3, r?.Option4]
      .map(v => String(v ?? '').trim())
      .filter(v => v !== '');

    const correctAnswer = String(r?.CorrectAnswer ?? '').trim();
    const correctIndex = options.findIndex(o => o === correctAnswer);

    const level = (String(r?.Category || '').trim().toLowerCase()) || 'general'; // 👈 NEW

    questions.push({ question, options, correctAnswer, correctIndex, level });    // 👈 NEW
  }

  return { totalQ, category, questions };
}

// 1) ********************Admin practice test upload controller*****************
export const uploadPractice = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Read workbook from disk
    const wb = XLSX.readFile(req.file.path);
    const firstSheet = wb.SheetNames[0];
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const { totalQ, category, questions } = extractMetaAndQuestions(rows);

    const title = toTitle(req.file.originalname);

    const doc = await Practice.create({
      title,
      category,
      totalQuestionCount: totalQ,
      questions,
      filePath: `/uploads/practice/${req.file.filename}`,
      localPath: req.file.path,
      createdBy: req.adminId || null, // set by admin auth middleware
    });

    return res.status(201).json({ message: 'Practice uploaded', doc });
  } catch (err) {
    console.error('uploadPractice error:', err);
    return res.status(500).json({ message: 'Failed to upload practice', error: err?.message || err });
  }
};


// 2) ********************Admin fetch all practice test controller*****************
export const listPractices = async (_req, res) => {
  const docs = await Practice.find({}, { title: 1, category: 1, totalQuestionCount: 1, createdAt: 1 }).sort({ createdAt: -1 });
  return res.json(docs);
};


// 3) ********************Admin fetch one practice test controller*****************
export const previewPractice = async (req, res) => {
  const doc = await Practice.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  return res.json({ title: doc.title, category: doc.category, totalQuestionCount: doc.totalQuestionCount, questions: doc.questions });
};


// 4) ********************Admin download a practice test controller*****************
export const downloadPractice = async (req, res) => {
  const doc = await Practice.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  return res.download(doc.localPath, path.basename(doc.localPath));
};


// 5) ********************Admin delete a practice test controller*****************
export const deletePractice = async (req, res) => {
  const doc = await Practice.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });

  // remove file if exists
  try { await fs.unlink(doc.localPath); } catch {}
  await doc.deleteOne();

  return res.json({ message: 'Deleted' });
};
