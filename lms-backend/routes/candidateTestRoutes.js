// E:\new lms\Backend\lms-backend\routes\candidateTestRoutes.js
import { Router } from 'express';
import candidateAuth from '../middleware/candidateAuth.js';
import { getLinkedTestForChapter,
         submitChapterTest,
         getLinkedPracticeForChapter,
         savePracticeResult,
         getSubjectLinkedSubjectTests,
         submitSubjectTest,   
       } from '../controllers/candidateTestController.js';

const router = Router();

// 1)GET /api/candidate-test/subjects/:subjectId/chapters/:chapterId/linked
router.get('/subjects/:subjectId/chapters/:chapterId/linked', candidateAuth,
    getLinkedTestForChapter
);

// 2)--- candidate test submit-plan route ---
router.post(
  '/subjects/:subjectId/chapters/:chapterId/submit',
  candidateAuth,
  submitChapterTest
);

// 3) GET candidate linked PRACTICE for a chapter
router.get(
  '/subjects/:subjectId/chapters/:chapterId/linked-practice',
  candidateAuth,
  getLinkedPracticeForChapter
);


// 4) Save (or replace) a candidate’s practice result for a chapter’s linked practice
router.post(
  '/subjects/:subjectId/chapters/:chapterId/practice-result',
  candidateAuth,
  savePracticeResult
);


// 5) candidate fetches a random subject test from linked subject tests with a subject.
router.get('/subject/:subjectId/subject-tests', 
  candidateAuth, 
  getSubjectLinkedSubjectTests
);

// 6) candidate submits a subject test linked with any subject
router.post(
  '/subject/:subjectId/subject-tests/submit',
  candidateAuth,
  submitSubjectTest
);

export default router;
