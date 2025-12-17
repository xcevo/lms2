// test controller — TODO: implement real logic
export const placeholder = (req, res) => {
  res.json({ ok: true, resource: 'test', message: 'Not implemented yet' })
}
// controllers/testController.js
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import Test from '../models/Test.js';

// Helpers to read excel
function readWorkbook(localPath) {
  // when saved via multer, localPath is a normal FS path
  const buf = fssync.readFileSync(localPath);
  return xlsx.read(buf, { type: 'buffer' });
}

//1.========Admin uploads a test controller =============*
export const uploadTest = async (req, res) => {
  try {
    const file = req.file; // multer puts it here
    if (!file) return res.status(400).json({ message: 'No file provided' });

    const localPath = file.path; // uploads/tests/<filename>
    const publicUrl = `${req.protocol}://${req.get('host')}/uploads/tests/${file.filename}`;

    // parse workbook to pull meta + questions (same pattern as your old code)
    const workbook = readWorkbook(localPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // meta row (2nd row, index 1) – matches your earlier controller
    const metaRow = xlsx.utils.sheet_to_json(sheet, { header: 1 })[1] || [];

    const duration = Number(metaRow[6]) || 0;
    const totalQuestionCount = Number(metaRow[7]) || 0;
    const randomizedQuestionCount = Number(metaRow[8]) || 0;
    const passingPercentage = Number(metaRow[9]) || 0;

    // questions begin at row index 2 with headers:
    const questions = xlsx.utils.sheet_to_json(sheet, {
      header: ['Question', 'A', 'B', 'C', 'D', 'Answer'],
      range: 2,
    });

    const test = await Test.create({
      title: path.parse(file.originalname).name,
      filePath: publicUrl,
      localPath,
      duration,
      randomizedQuestionCount,
      totalQuestionCount,
      passingPercentage,
      questions,
    });

    res.status(201).json({ message: 'Test uploaded', test });
  } catch (err) {
    console.error('Error uploading test:', err);
    res.status(500).json({ message: 'Error uploading test', error: err.message });
  }
};

//2.========Admin fetch all tests controller =============*
export const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.status(200).json(tests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tests', error: err.message });
  }
};

//3.========Admin deletes a test controller =============*
export const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // remove file from disk if it still exists
    if (test.localPath) {
      try { await fs.unlink(test.localPath); } catch {}
    }

    await Test.findByIdAndDelete(test._id);
    res.status(200).json({ message: 'Test and file deleted successfully' });
  } catch (err) {
    console.error('Error deleting test:', err);
    res.status(500).json({ message: 'Failed to delete test', error: err.message });
  }
};

//4.========Admin fetch a single test controller =============*
export const previewTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const workbook = readWorkbook(test.localPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const questions = xlsx.utils.sheet_to_json(sheet, {
      header: ['Question', 'A', 'B', 'C', 'D', 'Answer'],
      range: 1, // include row after meta
    });

    res.status(200).json({ testTitle: test.title, questions });
  } catch (err) {
    console.error('Error previewing test:', err);
    res.status(500).json({ message: 'Failed to preview test', error: err.message });
  }
};

//5.========Admin downloads a test controller =============*
export const downloadTestFile = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    // Let the browser download the original file
    res.download(test.localPath, path.basename(test.localPath));
  } catch (err) {
    console.error('Error downloading test:', err);
    res.status(500).json({ message: 'Failed to download test', error: err.message });
  }
};
