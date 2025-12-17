// routes/candidateRoutes.js
import express from 'express';
import { registerCandidate,
         checkUsername,
         getPublicSubjectOptions,
         loginCandidate,
         candidateMe, 
         getMySubjects,
 } from '../controllers/candidateController.js';
import candidateAuth from '../middleware/candidateAuth.js';


const router = express.Router();

//1.========= candidate register route =========*
router.post('/register', registerCandidate);

//2.========== unique username for each candidate route(for both admin and candidate) ==========*
router.get('/username/check', checkUsername);  // public

//2.========== realtime subject names chips public route(for both admin and candidate) ==========*
router.get('/subjects/options', getPublicSubjectOptions); // public

//3.========== candidate login ==========
router.post('/login', loginCandidate); // public

//4.========== candidate profile (self) ==========
router.get('/me', candidateAuth, candidateMe); // protected

//5.========== candidate's subscribed subjects (full objects) ==========
router.get('/my-subjects', candidateAuth, getMySubjects); // protected

export default router;
