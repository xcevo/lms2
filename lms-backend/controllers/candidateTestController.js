import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import Subject from '../models/Subject.js';
import Test from '../models/Test.js';
import Practice from '../models/practice.js'; // NEW
import SubjectTest from '../models/SubjectTest.js';




const toId = (v) => (v && v.subjectId ? String(v.subjectId) : String(v));

// 1)*************candidate test fetch controller****************
export async function getLinkedTestForChapter(req, res) {
  const { subjectId, chapterId } = req.params;

  if (!subjectId || !chapterId) {
    return res
      .status(400)
      .json({ message: 'subjectId and chapterId are required in the URL.' });
  }

  try {
    // ---- 1) Verify candidate is actually assigned this subject ----
    // Candidate.subjects = [{ subjectId, name }, ...]
    const orList = [{ 'subjects.subjectId': String(subjectId) }];
    if (mongoose.Types.ObjectId.isValid(subjectId)) {
      orList.push({ 'subjects.subjectId': new mongoose.Types.ObjectId(subjectId) });
    }

    const isAssigned = await Candidate.exists({
      _id: req.candidateId, // set by candidateAuth
      $or: orList,
    });
    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this subject.' });
    }

    // ---- 2) Load subject and locate the chapter ----
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found.' });
    }

    const chapter = (subject.chapters || []).find(
      (c) => String(c._id) === String(chapterId)
    );
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found.' });
    }

    // ---- 3) Chapter must have a linked test ----
    if (!chapter.linkedTest) {
      return res.status(404).json({ message: 'No test linked with this chapter.' });
    }

    // ---- 4) BEFORE fetching the Test doc, block if candidate already PASSED this test ----
const linkedId =
  mongoose.Types.ObjectId.isValid(chapter.linkedTest)
    ? new mongoose.Types.ObjectId(chapter.linkedTest)
    : chapter.linkedTest;

// Make sure status:'pass' and the same testId match in the SAME array element
const alreadyPassedDoc = await Candidate.findOne(
  {
    _id: req.candidateId,
    testResults: {
      $elemMatch: {
        testId: linkedId,
        status: 'pass',
      },
    },
  },
  { 'testResults.$': 1 } // return only the matched element
).lean();

if (alreadyPassedDoc?.testResults?.[0]) {
  const tr = alreadyPassedDoc.testResults[0];
  return res.status(409).json({
    blocked: true,
    reason: 'alreadyPassed',
    message: 'You have already passed this test.',
    testId: String(chapter.linkedTest),
    scorePercentage: tr.scorePercentage,
    attemptCount: tr.attemptCount,
    attemptedAt: tr.attemptedAt,
  });
}


    // ---- 5) Not passed yet => fetch and return the linked Test normally ----
    const test = await Test.findById(chapter.linkedTest).lean();
    if (!test) {
      return res
        .status(404)
        .json({ message: 'Linked test was not found in the database.' });
    }

    return res.status(200).json({
      subject: { _id: subject._id, name: subject.name },
      chapter: { _id: chapter._id, name: chapter.name },
      test,
    });
  } catch (err) {
    console.error('getLinkedTestForChapter error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}


// 2)*************candidate test submit controller****************
export async function submitChapterTest(req, res) {
  const { subjectId, chapterId } = req.params;
  const { testId, answers, timeTakenSec } = req.body || {};

  if (!subjectId || !chapterId) {
    return res.status(400).json({ message: 'subjectId and chapterId are required.' });
  }
  if (!testId || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: 'testId and non-empty answers[] are required.' });
  }

  try {
    // 0) Load candidate (to check assignment + update testResults)
    const cand = await Candidate.findById(req.candidateId).select('subjects testResults').exec();
    if (!cand) return res.status(404).json({ message: 'Candidate not found.' });

    // Accept both shapes: [ObjectId] OR [{subjectId, name}]
    const assignedIds = (cand.subjects || []).map(toId);
    if (!assignedIds.includes(String(subjectId))) {
      return res.status(403).json({ message: 'You are not assigned to this subject.' });
    }

    // 1) Ensure subject + chapter exist and are linked to this test
    const subject = await Subject.findById(subjectId).select('name chapters').lean();
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const chapter = (subject.chapters || []).find(c => String(c._id) === String(chapterId));
    if (!chapter) return res.status(404).json({ message: 'Chapter not found.' });

    if (!chapter.linkedTest) {
      return res.status(400).json({ message: 'This chapter has no linked test.' });
    }
    if (String(chapter.linkedTest) !== String(testId)) {
      return res.status(400).json({ message: 'Submitted test does not match the linked test for this chapter.' });
    }

    // 2) Load the full Test (get passingPercentage & correct answers)
    const test = await Test.findById(testId).lean();
    if (!test) return res.status(404).json({ message: 'Test not found.' });
    // after you load the Test doc as `test` (which has `duration` in minutes)
const maxAllowed = Number(test?.duration || 0) * 60;
let takenSec = Number(timeTakenSec);
if (!Number.isFinite(takenSec) || takenSec < 0) takenSec = 0;
if (maxAllowed > 0 && takenSec > maxAllowed) takenSec = maxAllowed;


    const qs = Array.isArray(test.questions) ? test.questions : [];
    // Grade: compare provided answers with the test answers.
    let correct = 0;
    for (const a of answers) {
      const idx = Number(a.index);
      if (Number.isNaN(idx) || idx < 0 || idx >= qs.length) continue;
      const q = qs[idx];

      // Accept either the option letter (A/B/C/D) OR the actual text
      let chosenText = null;
      if (typeof a.selected === 'string' && ['A','B','C','D'].includes(a.selected.toUpperCase())) {
        chosenText = q[a.selected.toUpperCase()];
      } else if (typeof a.selected === 'string') {
        chosenText = a.selected;
      }

      if (chosenText != null && String(chosenText).trim() === String(q.Answer).trim()) {
        correct += 1;
      }
    }
    const totalConsidered = answers.length;
    const scoreRaw = totalConsidered > 0 ? (correct / totalConsidered) * 100 : 0;
    const scorePercentage = Math.round(scoreRaw * 100) / 100; // two decimals

    const passed = scorePercentage >= Number(test.passingPercentage || 0);
    const status = passed ? 'pass' : 'fail';

    // 3) Update candidate.testResults per submit-plan
    const existingIdx = (cand.testResults || []).findIndex(
      (r) => String(r.testId) === String(testId)
    );

    if (existingIdx >= 0) {
      const existing = cand.testResults[existingIdx];

      // Already passed => lock further attempts
      if (existing.status === 'pass') {
        return res.status(409).json({
          message: 'You have already passed this test.',
          result: {
            testId: existing.testId,
            status: existing.status,
            scorePercentage: existing.scorePercentage,
            attemptCount: existing.attemptCount,
            attemptedAt: existing.attemptedAt,
          },
          locked: true,
        });
      }

      // Re-attempt: replace score, bump attempts, set status
      existing.scorePercentage = scorePercentage;
      existing.status = status;
      existing.attemptCount = (existing.attemptCount || 1) + 1;
      existing.attemptedAt = new Date();
      existing.timeTakenSec = takenSec;
    } else {
      // First attempt: create new record
      cand.testResults.push({
        testId: new mongoose.Types.ObjectId(testId),
        scorePercentage,
        status,
        attemptCount: 1,
        attemptedAt: new Date(),
        timeTakenSec: takenSec,
      });
    }

    await cand.save();

    return res.status(200).json({
      subject: { _id: subject._id, name: subject.name },
      chapter: { _id: chapter._id, name: chapter.name },
      test: { _id: test._id, title: test.title, passingPercentage: test.passingPercentage },
      grading: {
        totalConsidered,
        correct,
        scorePercentage,
        passed,
        timeTakenSec: takenSec,
      },
      resultStored: true,
    });
  } catch (err) {
    console.error('submitChapterTest error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// 3)*************candidate practice test fetch controller****************
export async function getLinkedPracticeForChapter(req, res) {
  const { subjectId, chapterId } = req.params;

  if (!subjectId || !chapterId) {
    return res
      .status(400)
      .json({ message: 'subjectId and chapterId are required in the URL.' });
  }

  try {
    // ---- Verify candidate is assigned this subject ----
    const orList = [{ 'subjects.subjectId': String(subjectId) }];
    if (mongoose.Types.ObjectId.isValid(subjectId)) {
      orList.push({ 'subjects.subjectId': new mongoose.Types.ObjectId(subjectId) });
    }

    const isAssigned = await Candidate.exists({
      _id: req.candidateId,
      $or: orList,
    });
    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this subject.' });
    }

    // ---- Load subject + chapter ----
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const chapter = (subject.chapters || []).find(
      (c) => String(c._id) === String(chapterId)
    );
    if (!chapter) return res.status(404).json({ message: 'Chapter not found.' });

    // ---- Must have a linkedPracticeTest ----
    if (!chapter.linkedPracticeTest) {
      return res.status(404).json({ message: 'No practice test linked with this chapter.' });
    }

    // ---- Fetch the full Practice document ----
    const practice = await Practice.findById(chapter.linkedPracticeTest).lean();
    if (!practice) {
      return res.status(404).json({ message: 'Linked practice was not found in the database.' });
    }

    // Return everything (full doc)
    return res.status(200).json({
      subject: { _id: subject._id, name: subject.name },
      chapter: { _id: chapter._id, name: chapter.name },
      practice, // entire Practice document
    });
  } catch (err) {
    console.error('getLinkedPracticeForChapter error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// 4)************* save candidate practice test results controller****************
export const savePracticeResult = async (req, res) => {
  try {
    const candidateId =
      req.candidateId || req.userId || (req.user && (req.user._id || req.user.id));
    if (!candidateId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { subjectId, chapterId } = req.params;
    const { practiceId, attempted, correct, scorePercent, level } = req.body || {};

    if (!practiceId) return res.status(400).json({ message: 'practiceId is required' });

    // Basic existence checks
    const practiceExists = await Practice.exists({ _id: practiceId });
    if (!practiceExists) return res.status(404).json({ message: 'Practice not found' });

    const subject = await Subject.findById(subjectId).select('chapters name');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    // (Optional but safer) ensure the provided practiceId really is the one linked to this chapter
    if (chapter.linkedPracticeTest?.toString() !== String(practiceId)) {
      return res.status(400).json({ message: 'Provided practice does not match chapter link' });
    }

    // Overwrite previous result for this practice, if any
    await Candidate.findByIdAndUpdate(
      candidateId,
      { $pull: { practiceResults: { practice: practiceId } } },
      { new: false }
    );

    const result = {
      practice: practiceId,
      subject: subjectId,
      chapter: chapterId,
      level: level || '',
      attempted: Number(attempted || 0),
      correct: Number(correct || 0),
      scorePercent: Number(scorePercent || 0),
      updatedAt: new Date(),
    };

    const updated = await Candidate.findByIdAndUpdate(
      candidateId,
      { $push: { practiceResults: result } },
      { new: true }
    ).select('_id practiceResults');

    return res.status(201).json({
      message: 'Practice result saved',
      result,
      totalResults: updated?.practiceResults?.length || 0,
    });
  } catch (err) {
    console.error('savePracticeResult error:', err);
    return res.status(500).json({ message: 'Failed to save practice result' });
  }
};

// 5)************* candidate: fetch subject-level SubjectTests *************
export async function getSubjectLinkedSubjectTests(req, res) {
  const { subjectId } = req.params;
  if (!subjectId) return res.status(400).json({ message: 'subjectId is required' });

  try {
    // Assignment check (unchanged)
    const orList = [{ 'subjects.subjectId': String(subjectId) }];
    if (mongoose.Types.ObjectId.isValid(subjectId)) {
      orList.push({ 'subjects.subjectId': new mongoose.Types.ObjectId(subjectId) });
    }
    const isAssigned = await Candidate.exists({ _id: req.candidateId, $or: orList });
    if (!isAssigned) {
      return res.status(403).json({ message: 'You are not assigned to this subject.' });
    }

    // Subject + linked ids (unchanged)
    const subject = await Subject.findById(subjectId)
      .select('name linkedSubjectTests')
      .lean();
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const ids = (subject.linkedSubjectTests || [])
      .map((x) => x?.subjectTestId)
      .filter((v) => mongoose.Types.ObjectId.isValid(v))
      .map((v) => new mongoose.Types.ObjectId(v));

    if (ids.length === 0) {
      return res.status(200).json({
        subject: { _id: subject._id, name: subject.name },
        count: 0,
        tests: [],
      });
    }

    // NEW: find which of these subject tests are already PASSED by the candidate
    const cand = await Candidate.findById(req.candidateId)
      .select('subtestResults')
      .lean();

    const passedSet = new Set(
      (cand?.subtestResults || [])
        .filter(r => r && r.status === 'pass')
        .map(r => String(r.subjectTestId))
    );

    // Fetch all SubjectTest docs for those ids
    let tests = await SubjectTest.find({ _id: { $in: ids } })
      .select('title duration totalQuestionCount passingPercentage questions filePath createdAt updatedAt')
      .lean();

    // Filter out the already-passed ones
    const notPassed = tests.filter(t => !passedSet.has(String(t._id)));

    if (notPassed.length === 0) {
      // All linked subject tests are already passed
      return res.status(409).json({
        allPassed: true,
        message: 'You have passed all the tests for this subject.',
        subject: { _id: subject._id, name: subject.name },
        count: 0,
        tests: [],
      });
    }

    // Return only tests that are not yet passed
    return res.status(200).json({
      subject: { _id: subject._id, name: subject.name },
      count: notPassed.length,
      tests: notPassed,
      meta: {
        totalLinked: ids.length,
        passedCount: ids.length - notPassed.length,
        remainingCount: notPassed.length,
      }
    });
  } catch (err) {
    console.error('getSubjectLinkedSubjectTests error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

// ************* candidate: submit a SUBJECT TEST (not chapter test) *************
export async function submitSubjectTest(req, res) {
  const { subjectId } = req.params;
  const { subjectTestId, answers, timeTakenSec } = req.body || {};

  if (!subjectId) return res.status(400).json({ message: 'subjectId is required.' });
  if (!subjectTestId) return res.status(400).json({ message: 'subjectTestId is required.' });
  // NOTE: manual submit ke behaviour ko preserve karne ke liye is validation ko as-is rehne diya hai
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: 'non-empty answers[] is required.' });
  }

  try {
    // 0) Candidate load + assignment check
    const cand = await Candidate.findById(req.candidateId).select('subjects subtestResults').exec();
    if (!cand) return res.status(404).json({ message: 'Candidate not found.' });

    const assignedIds = (cand.subjects || []).map((v) => (v && v.subjectId ? String(v.subjectId) : String(v)));
    if (!assignedIds.includes(String(subjectId))) {
      return res.status(403).json({ message: 'You are not assigned to this subject.' });
    }

    // 1) Subject exists + given subjectTest is actually linked to this subject
    const subject = await Subject.findById(subjectId).select('name linkedSubjectTests').lean();
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const isLinked = (subject.linkedSubjectTests || []).some(
      (x) => String(x?.subjectTestId) === String(subjectTestId)
    );
    if (!isLinked) {
      return res.status(400).json({ message: 'This subject does not have the provided subject test linked.' });
    }

    // 2) Load SubjectTest for grading
    const sTest = await SubjectTest.findById(subjectTestId).lean();
    if (!sTest) return res.status(404).json({ message: 'SubjectTest not found.' });

    const qs = Array.isArray(sTest.questions) ? sTest.questions : [];

  // normalize and clamp timeTaken (seconds). If client didn't send, fall back to 0.
  const maxAllowed = Number(sTest?.duration || 0) * 60;          // duration is in minutes
  let takenSec = Number(timeTakenSec);
  if (!Number.isFinite(takenSec) || takenSec < 0) takenSec = 0;
  if (maxAllowed > 0 && takenSec > maxAllowed) takenSec = maxAllowed;

    // ---------- FIX: grade against TOTAL QUESTIONS, not attempted ----------
    // totalQuestions = declared total OR questions array length
    const totalQuestions =
      Number(sTest.totalQuestionCount) ||
      (Array.isArray(sTest.questions) ? sTest.questions.length : 0);

    // 3) Grade answers (same approach as chapter test)
    let correct = 0;
    for (const a of answers) {
      const idx = Number(a.index);
      if (Number.isNaN(idx) || idx < 0 || idx >= qs.length) continue;
      const q = qs[idx];

      // support option key ('A'|'B'|'C'|'D') or raw text
      let chosenText = null;
      if (typeof a.selected === 'string' && ['A', 'B', 'C', 'D'].includes(a.selected.toUpperCase())) {
        chosenText = q[a.selected.toUpperCase()];
      } else if (typeof a.selected === 'string') {
        chosenText = a.selected;
      }

      if (chosenText != null && String(chosenText).trim() === String(q.Answer).trim()) {
        correct += 1;
      }
    }

    // ⚠️ Denominator is totalQuestions (not answers.length)
    const attempted = answers.length;
    const rawPct = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
    const scorePercentage = Math.round(rawPct * 100) / 100;
    const passed = scorePercentage >= Number(sTest.passingPercentage || 0);
    const status = passed ? 'pass' : 'fail';
    // ----------------------------------------------------------------------

    // 4) Upsert into candidate.subtestResults
    const idx = (cand.subtestResults || []).findIndex(
      (r) => String(r.subjectTestId) === String(subjectTestId)
    );

    if (idx >= 0) {
      const existing = cand.subtestResults[idx];
      if (existing.status === 'pass') {
        return res.status(409).json({
          message: 'You have already passed this subject test.',
          result: {
            subjectTestId: existing.subjectTestId,
            status: existing.status,
            scorePercentage: existing.scorePercentage,
            attemptCount: existing.attemptCount,
            attemptedAt: existing.attemptedAt,
          },
          locked: true,
        });
      }
      existing.scorePercentage = scorePercentage;
      existing.status = status;
      existing.attemptCount = (existing.attemptCount || 1) + 1;
      existing.attemptedAt = new Date();
      existing.timeTakenSec = takenSec;
    } else {
      cand.subtestResults.push({
        subjectTestId,
        scorePercentage,
        status,
        attemptCount: 1,
        attemptedAt: new Date(),
        timeTakenSec: takenSec,
      });
    }

    await cand.save();

    return res.status(200).json({
      subject: { _id: subject._id, name: subject.name },
      test: {
        _id: sTest._id,
        title: sTest.title,
        passingPercentage: sTest.passingPercentage,
      },
      grading: {
        totalQuestions,       // ✅ new: useful for UI/debug
        attempted,            // (old totalConsidered equivalent)
        correct,
        scorePercentage,
        passed,
        timeTakenSec: takenSec
      },
      resultStored: true,
    });
  } catch (err) {
    console.error('submitSubjectTest error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
