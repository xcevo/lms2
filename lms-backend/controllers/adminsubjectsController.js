// controllers/adminsubjectsController.js
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Subject from '../models/Subject.js';
import Test from '../models/Test.js';
import Practice from '../models/practice.js';
import SubjectTest from '../models/SubjectTest.js';



const safeUnlink = (p) => {
  if (!p) return;
  try { fs.unlinkSync(p); } catch {}
};

//1.=======Admin add subject controller=========*
export const createSubject = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    const n = String(name || '').trim();
    const d = String(description || '').trim();
    const c = String(category || '').trim();

    if (!n) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

    // case-insensitive existence check
    const exists = await Subject.exists({ name: { $regex: new RegExp(`^${n}$`, 'i') } });
    if (exists) {
      return res.status(409).json({ message: 'Subject already exists' });
    }

    const subject = await Subject.create({ name: n, description: d, category: c });
    return res.status(201).json({ message: 'Subject created', subject });
  } catch (err) {
    console.error('createSubject error:', err);
    return res.status(500).json({ message: 'Failed to create subject' });
  }
};

//2.=======Admin fetch all subjects controller=========*
export const getAllSubjects = async (_req, res) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    return res.json({ subjects });
  } catch (err) {
    console.error('getAllSubjects error:', err);
    return res.status(500).json({ message: 'Failed to fetch subjects' });
  }
};


//3.========== Update a subject (admin only) ==========
export const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject id' });
    }

    const { name, description, category } = req.body;
    const update = {};

    // name (optional, but if present must be unique, case-insensitive)
    if (typeof name !== 'undefined') {
      const n = String(name).trim();
      if (!n) return res.status(400).json({ message: 'Name cannot be empty' });

      // escape regex
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const exists = await Subject.exists({
        _id: { $ne: subjectId },
        name: { $regex: new RegExp(`^${esc(n)}$`, 'i') },
      });
      if (exists) {
        return res.status(409).json({ message: 'Subject name already exists' });
      }
      update.name = n;
    }

    if (typeof description !== 'undefined') {
      update.description = String(description).trim();
    }

    if (typeof category !== 'undefined') {
      update.category = String(category).trim();
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const subject = await Subject.findByIdAndUpdate(
      subjectId,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    return res.json({ message: 'Subject updated', subject });
  } catch (err) {
    console.error('updateSubject error:', err);
    return res.status(500).json({ message: 'Failed to update subject' });
  }
};

//4.========== Delete a subject (admin only) ==========
export const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject id' });
    }

    const subject = await Subject.findByIdAndDelete(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    return res.json({ message: 'Subject deleted', subject });
  } catch (err) {
    console.error('deleteSubject error:', err);
    return res.status(500).json({ message: 'Failed to delete subject' });
  }
};


// ========== CHAPTERS ==========

// 1) Create a chapter under a subject
export const addChapter = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name = '', description = '' } = req.body;

    if (!name.trim()) {
      return res.status(400).json({ message: 'Chapter name is required' });
    }

    // files from multer.fields([{name:'pdf'},{name:'video'}])
    const pdfPath = req?.files?.pdf?.[0]?.path || '';
    const videoPath = req?.files?.video?.[0]?.path || '';

    if (!pdfPath) {
      return res.status(400).json({ message: 'PDF is required for a chapter' });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const chapter = {
      name: name.trim(),
      description: description?.trim() || '',
      pdfPath,
      videoPath,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    subject.chapters.push(chapter);
    await subject.save();

    // return the last pushed (with _id)
    const created = subject.chapters[subject.chapters.length - 1];
    res.status(201).json({ message: 'Chapter created', chapter: created, subjectId });
  } catch (err) {
    console.error('addChapter error:', err);
    res.status(500).json({ message: 'Failed to create chapter' });
  }
};

// 2) Get all chapters of a subject
export const getChapters = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const subject = await Subject.findById(subjectId).select('name chapters');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ subject: { _id: subject._id, name: subject.name }, chapters: subject.chapters });
  } catch (err) {
    console.error('getChapters error:', err);
    res.status(500).json({ message: 'Failed to fetch chapters' });
  }
};

// 3) Delete a chapter from a subject
export const deleteChapter = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    // remove files from disk
    safeUnlink(chapter.pdfPath);
    safeUnlink(chapter.videoPath);

    // ✨ remove the subdocument (Mongoose v7-safe)
    subject.chapters.pull({ _id: chapterId }); // or: chapter.deleteOne();

    await subject.save();

    res.json({ message: 'Chapter deleted', chapterId });
  } catch (err) {
    console.error('deleteChapter error:', err);
    res.status(500).json({ message: 'Failed to delete chapter' });
  }
};

// 4) Edit/update a chapter (name/description and optionally replace files)
export const updateChapter = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const { name, description } = req.body;

    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    if (typeof name === 'string' && name.trim()) chapter.name = name.trim();
    if (typeof description === 'string') chapter.description = description.trim();

    // file replacements (optional)
    const newPdf = req?.files?.pdf?.[0]?.path;
    const newVideo = req?.files?.video?.[0]?.path;

    if (newPdf) {
      safeUnlink(chapter.pdfPath);
      chapter.pdfPath = newPdf;
    }
    if (newVideo) {
      safeUnlink(chapter.videoPath);
      chapter.videoPath = newVideo;
    }

    chapter.updatedAt = new Date();
    await subject.save();

    res.json({ message: 'Chapter updated', chapter });
  } catch (err) {
    console.error('updateChapter error:', err);
    res.status(500).json({ message: 'Failed to update chapter' });
  }
};

// 5) --- Public: stream a chapter PDF (no auth) ---
export const streamChapterPdf = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;

    const subject = await Subject.findById(subjectId).select('name chapters');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const pdfFull = chapter.pdfPath;
    if (!pdfFull || !fs.existsSync(pdfFull)) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    const filename = path.basename(pdfFull);
    res.setHeader('Content-Type', 'application/pdf');
    // "inline" opens in-browser; change to "attachment" to force download
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    fs.createReadStream(pdfFull).pipe(res);
  } catch (err) {
    console.error('streamChapterPdf error:', err);
    res.status(500).json({ message: 'Failed to fetch PDF' });
  }
};


// 6) --- Public: stream/download a chapter's video (no auth) ---
export const streamChapterVideo = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;

    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const chapter = subject.chapters?.find((c) => String(c._id) === String(chapterId));
    if (!chapter || !chapter.videoPath)
      return res.status(404).json({ message: 'Video not found' });

    const filePath = path.resolve(chapter.videoPath);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'File missing on server' });

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const ext = path.extname(filePath).toLowerCase();
    const typeMap = {
      '.mp4': 'video/mp4',
      '.m4v': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.ogv': 'video/ogg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska'
    };
    const contentType = typeMap[ext] || 'application/octet-stream';

    // Optional download hint: /video?dl=1 -> force download
    const asDownload = req.query.dl === '1';

    if (range) {
      // Handle HTTP Range requests for efficient streaming/scrubbing
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      res.status(206).set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType
      });
      if (asDownload) {
        res.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      }
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.status(200).set({
        'Content-Length': fileSize,
        'Content-Type': contentType
      });
      if (asDownload) {
        res.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      }
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('streamChapterVideo error:', err);
    res.status(500).json({ message: 'Failed to stream video' });
  }
};


// 7) Link a test to a chapter (single-selection)
export const linkChapterTest = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const { testId } = req.body;

    if (!testId) return res.status(400).json({ message: 'testId is required' });
    const testExists = await Test.exists({ _id: testId });
    if (!testExists) return res.status(404).json({ message: 'Test not found' });

    const subject = await Subject.findById(subjectId).select('chapters name');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const ch = subject.chapters.id(chapterId);
    if (!ch) return res.status(404).json({ message: 'Chapter not found' });

    ch.linkedTest = testId;
    ch.updatedAt = new Date();
    await subject.save();

    const test = await Test.findById(testId).select('title');
    return res.json({
      message: 'Test linked to chapter',
      subjectId,
      chapterId,
      linkedTest: { _id: testId, title: test?.title || '' },
    });
  } catch (err) {
    console.error('linkChapterTest error:', err);
    res.status(500).json({ message: 'Failed to link test' });
  }
};

// 8) Unlink the test from a chapter
export const unlinkChapterTest = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;

    const subject = await Subject.findById(subjectId).select('chapters name');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const ch = subject.chapters.id(chapterId);
    if (!ch) return res.status(404).json({ message: 'Chapter not found' });

    ch.linkedTest = null;
    ch.updatedAt = new Date();
    await subject.save();

    return res.json({
      message: 'Test unlinked from chapter',
      subjectId,
      chapterId,
    });
  } catch (err) {
    console.error('unlinkChapterTest error:', err);
    res.status(500).json({ message: 'Failed to unlink test' });
  }
};


// topic related controllers

// 1) Create a topic under a chapter
export const addChapterTopic = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const { name, pdfPage = 1, videoStartSec = 0, videoEndSec = 0 } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Topic name is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(400).json({ message: 'Invalid subject or chapter id' });
    }

    // pre-create an _id so we can return the created topic easily
    const topicId = new mongoose.Types.ObjectId();
    const topic = {
      _id: topicId,
      name: String(name).trim(),
      pdfPage: Number(pdfPage) || 1,
      videoStartSec: Number(videoStartSec) || 0,
      videoEndSec: Number(videoEndSec) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = await Subject.findOneAndUpdate(
      { _id: subjectId },
      {
        $push: { 'chapters.$[c].topics': topic },
        $set: { 'chapters.$[c].updatedAt': new Date() },
      },
      {
        new: true,
        arrayFilters: [{ 'c._id': new mongoose.Types.ObjectId(chapterId) }],
        projection: { chapters: { $elemMatch: { _id: new mongoose.Types.ObjectId(chapterId) } } },
      }
    ).lean();

    if (!updated?.chapters?.length) {
      return res.status(404).json({ message: 'Subject/Chapter not found' });
    }

    // return the topic we just pushed
    return res.status(201).json({ message: 'Topic created', topic });
  } catch (err) {
    console.error('addChapterTopic error:', err);
    return res.status(500).json({ message: 'Failed to create topic' });
  }
};


// 2) Get all topics of a chapter
export const listChapterTopics = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(400).json({ message: 'Invalid subject or chapter id' });
    }

    const subject = await Subject.findOne({ _id: subjectId, 'chapters._id': chapterId }, { 'chapters.$': 1 }).lean();
    if (!subject) return res.status(404).json({ message: 'Subject/Chapter not found' });

    const topics = (subject.chapters?.[0]?.topics || []).map(t => ({
      _id: t._id,
      name: t.name,
      pdfPage: t.pdfPage,
      videoStartSec: t.videoStartSec,
      videoEndSec: t.videoEndSec,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return res.json({ count: topics.length, topics });
  } catch (err) {
    console.error('listChapterTopics error:', err);
    return res.status(500).json({ message: 'Failed to fetch topics' });
  }
};

// 3) Update a topic (name/page/timestamps)
export const updateChapterTopic = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId } = req.params;
    if (![subjectId, chapterId, topicId].every(mongoose.Types.ObjectId.isValid)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }

    const payload = {};
    if (typeof req.body.name !== 'undefined') {
      const n = String(req.body.name).trim();
      if (!n) return res.status(400).json({ message: 'Topic name cannot be empty' });
      payload['chapters.$[c].topics.$[t].name'] = n;
    }
    if (typeof req.body.pdfPage !== 'undefined') {
      payload['chapters.$[c].topics.$[t].pdfPage'] = Number(req.body.pdfPage) || 1;
    }
    if (typeof req.body.videoStartSec !== 'undefined') {
      payload['chapters.$[c].topics.$[t].videoStartSec'] = Number(req.body.videoStartSec) || 0;
    }
    if (typeof req.body.videoEndSec !== 'undefined') {
      payload['chapters.$[c].topics.$[t].videoEndSec'] = Number(req.body.videoEndSec) || 0;
    }
    payload['chapters.$[c].topics.$[t].updatedAt'] = new Date();

    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updated = await Subject.findOneAndUpdate(
      { _id: subjectId },
      { $set: payload },
      {
        new: true,
        arrayFilters: [{ 'c._id': new mongoose.Types.ObjectId(chapterId) }, { 't._id': new mongoose.Types.ObjectId(topicId) }],
        projection: { chapters: { $elemMatch: { _id: chapterId } } },
      }
    ).lean();

    if (!updated?.chapters?.length) return res.status(404).json({ message: 'Subject/Chapter not found' });

    // return the updated topic
    const topic = updated.chapters[0].topics.find(t => String(t._id) === String(topicId));
    return res.json({ message: 'Topic updated', topic });
  } catch (err) {
    console.error('updateChapterTopic error:', err);
    return res.status(500).json({ message: 'Failed to update topic' });
  }
};

// 4) Delete a topic
export const deleteChapterTopic = async (req, res) => {
  try {
    const { subjectId, chapterId, topicId } = req.params;
    if (![subjectId, chapterId, topicId].every(mongoose.Types.ObjectId.isValid)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }

    const result = await Subject.findOneAndUpdate(
      { _id: subjectId },
      { $pull: { 'chapters.$[c].topics': { _id: new mongoose.Types.ObjectId(topicId) } } },
      {
        new: true,
        arrayFilters: [{ 'c._id': new mongoose.Types.ObjectId(chapterId) }],
        projection: { _id: 1 },
      }
    );

    if (!result) return res.status(404).json({ message: 'Subject/Chapter not found' });
    return res.json({ message: 'Topic deleted' });
  } catch (err) {
    console.error('deleteChapterTopic error:', err);
    return res.status(500).json({ message: 'Failed to delete topic' });
  }
};

//practice controllers
// 1) Link a practice test to a chapter (single-selection)
export const linkChapterPractice = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const { practiceId } = req.body;

    if (!practiceId) return res.status(400).json({ message: 'practiceId is required' });

    const practiceExists = await Practice.exists({ _id: practiceId });
    if (!practiceExists) return res.status(404).json({ message: 'Practice test not found' });

    const subject = await Subject.findById(subjectId).select('chapters name');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const ch = subject.chapters.id(chapterId);
    if (!ch) return res.status(404).json({ message: 'Chapter not found' });

    // single-selection link
    ch.linkedPracticeTest = practiceId;
    ch.updatedAt = new Date();
    await subject.save();

    const practice = await Practice.findById(practiceId).select('title');
    return res.json({
      message: 'Practice test linked to chapter',
      subjectId,
      chapterId,
      linkedPracticeTest: { _id: practiceId, title: practice?.title || '' },
    });
  } catch (err) {
    console.error('linkChapterPractice error:', err);
    res.status(500).json({ message: 'Failed to link practice test' });
  }
};

// 2) unLink a practice test to a chapter (single-selection)
export const unlinkChapterPractice = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;

    const subject = await Subject.findById(subjectId).select('chapters name');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const ch = subject.chapters.id(chapterId);
    if (!ch) return res.status(404).json({ message: 'Chapter not found' });

    ch.linkedPracticeTest = null;
    ch.updatedAt = new Date();
    await subject.save();

    return res.json({
      message: 'Practice test unlinked from chapter',
      subjectId,
      chapterId,
    });
  } catch (err) {
    console.error('unlinkChapterPractice error:', err);
    res.status(500).json({ message: 'Failed to unlink practice test' });
  }
};

// 1) Link a subject test to a subject (multiple-selection)
export const linkSubjectTests = async (req, res) => {
  try {
    const { subjectId } = req.params;
    let { subjectTestIds } = req.body; // string | string[]

    if (!subjectTestIds || (Array.isArray(subjectTestIds) && subjectTestIds.length === 0)) {
      return res.status(400).json({ message: 'subjectTestIds is required' });
    }
    if (!Array.isArray(subjectTestIds)) subjectTestIds = [subjectTestIds];

    // filter valid ObjectIds
    const validIds = subjectTestIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validIds.length) return res.status(400).json({ message: 'No valid subjectTestIds provided' });

    // fetch tests + titles
    const tests = await SubjectTest.find({ _id: { $in: validIds } }).select('title');
    if (!tests.length) return res.status(404).json({ message: 'No matching Subject Tests found' });

    const subject = await Subject.findById(subjectId).select('name linkedSubjectTests');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const existing = new Set(subject.linkedSubjectTests.map((x) => String(x.subjectTestId)));
    const added = [];

    for (const t of tests) {
      const idStr = String(t._id);
      if (!existing.has(idStr)) {
        subject.linkedSubjectTests.push({ subjectTestId: t._id, title: t.title || '' });
        added.push({ _id: t._id, title: t.title || '' });
      }
    }

    await subject.save();

    return res.json({
      message: 'Subject tests linked',
      subjectId,
      addedCount: added.length,
      linkedSubjectTests: subject.linkedSubjectTests.map((x) => ({ _id: x.subjectTestId, title: x.title })),
    });
  } catch (err) {
    console.error('linkSubjectTests error:', err);
    return res.status(500).json({ message: 'Failed to link subject tests' });
  }
};

// 2) Unlink a single subject test from a subject
export const unlinkSubjectTest = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { subjectTestId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(subjectId) ||
      !mongoose.Types.ObjectId.isValid(subjectTestId)
    ) {
      return res.status(400).json({ message: 'Invalid subjectId or subjectTestId' });
    }

    // ensure subject exists and link is present
    const subject = await Subject.findById(subjectId).select('linkedSubjectTests');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const isLinked = subject.linkedSubjectTests?.some(
      (x) => String(x.subjectTestId) === String(subjectTestId)
    );
    if (!isLinked) {
      return res.status(404).json({ message: 'Subject test is not linked to this subject' });
    }

    // pull the entry from the array
    await Subject.updateOne(
      { _id: subjectId },
      { $pull: { linkedSubjectTests: { subjectTestId } } }
    );

    // fetch updated list to return
    const updated = await Subject.findById(subjectId).select('linkedSubjectTests').lean();

    return res.json({
      message: 'Subject test unlinked',
      subjectId,
      removedId: subjectTestId,
      linkedSubjectTests: (updated?.linkedSubjectTests || []).map((x) => ({
        _id: x.subjectTestId,
        title: x.title || '',
      })),
    });
  } catch (err) {
    console.error('unlinkSubjectTest error:', err);
    return res.status(500).json({ message: 'Failed to unlink subject test' });
  }
};
