// routes/adminRoutes.js  (ESM; only the relevant routes for now)
import { Router } from 'express';
import { registerAdmin,
         loginAdmin,
         getAdminProfile,
         getAllCandidates,
         updateCandidate,
         deleteCandidate } from '../controllers/adminController.js';
import auth from '../middleware/auth.js';
const router = Router();

//1.============= Admin register route ===========*
router.post('/register', registerAdmin);

//2.============= Admin login route ==================*
router.post('/login', loginAdmin);

//3.============= admin rights protection route =========*
router.get('/me', auth, getAdminProfile);


//4.============= Admin fetch candidates detils list route ==========*
router.get('/candidates', auth, getAllCandidates);

//5.============= Admin edits candidate's name, subjects and password ========*
router.patch('/candidate/update/:candidateId', auth, updateCandidate);

//6.=========== delete a candidate (admin only)==============*
router.delete('/candidate/delete/:candidateId', auth, deleteCandidate);


export default router;
