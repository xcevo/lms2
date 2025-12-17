// controllers/adminController.js  (ESM; same logic/messages as old)
import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Candidate from '../models/Candidate.js';
import mongoose from 'mongoose';
import Subject from '../models/Subject.js';


//1.============= Admin Register===================*
export const registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new admin
    const newAdmin = new Admin({ email, password: hashedPassword });
    await newAdmin.save();

    return res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error registering admin', error: error.message });
  }
};

//2.========== Admin Login route =================*
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '10d' });

    // (same as old file; remove this log in prod)
    console.log('Secret used for signing:', process.env.JWT_SECRET);

    return res.json({ token, message: 'Admin logged in successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error logging in admin', error: error.message });
  }
};


//3.================= Admin profile route(for admin dashboard) ============* 
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    res.json({ admin });
  } catch (e) {
    res.status(500).json({ message: 'Error fetching profile', error: e.message });
  }
};


//================ Admin fetches candidates details and list ================*
export const getAllCandidates = async (req, res) => {
  try {
    // full objects, newest first
    const candidates = await Candidate.find({}).sort({ createdAt: -1 });
    return res.json({ candidates });
  } catch (err) {
    console.error('getAllCandidates error:', err);
    return res.status(500).json({ message: 'Failed to fetch candidates' });
  }
};

//================ Edit candidate details(name,password and subjects)===============*

export const updateCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { name, username, passwordPlain, subjects } = req.body;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate id' });
    }

    const update = {};

    // name
    if (typeof name !== 'undefined') {
      const n = String(name).trim();
      if (!n) return res.status(400).json({ message: 'Name cannot be empty' });
      update.name = n;
    }

    // username (basic check; uniqueness check agar chahiye to add kar sakte ho)
    if (typeof username !== 'undefined') {
      const u = String(username).trim();
      if (!u) return res.status(400).json({ message: 'Username cannot be empty' });
      if (/\s/.test(u)) {
        return res.status(400).json({ message: 'Username cannot contain spaces' });
      }
      update.username = u;
    }

    // password
    if (typeof passwordPlain !== 'undefined') {
      const p = String(passwordPlain);
      if (!p) return res.status(400).json({ message: 'Password cannot be empty' });
      if (/\s/.test(p)) {
        return res.status(400).json({ message: 'Password cannot contain spaces' });
      }
      update.passwordPlain = p;
      update.passwordHash = await bcrypt.hash(p, 10);
    }

    // subjects -> always save as [{ subjectId, name }]
    if (typeof subjects !== 'undefined') {
      if (!Array.isArray(subjects)) {
        return res.status(400).json({ message: 'Subjects must be an array' });
      }

      // 1) normalize to a list of {name?, subjectId?}
      const wanted = subjects
        .map((s) => {
          if (typeof s === 'string') return { name: s.trim() };
          if (s && typeof s === 'object') {
            const name =
              typeof s.name === 'string' ? s.name.trim() :
              typeof s.label === 'string' ? s.label.trim() : undefined;
            const subjectId =
              s.subjectId || s._id || s.value || undefined;
            return { name, subjectId };
          }
          return null;
        })
        .filter(Boolean);

      // 2) collect names/ids for lookup where missing
      const needNameLookup = wanted.filter(w => !w.subjectId && w.name).map(w => w.name);
      let idByName = new Map();

      if (needNameLookup.length) {
        const docs = await Subject.find(
          { name: { $in: needNameLookup } },
          { _id: 1, name: 1 }
        ).lean();
        idByName = new Map(docs.map(d => [d.name, d._id]));
      }

      // 3) build final selections (skip unknowns safely)
      const selections = wanted.map(w => {
        const id = w.subjectId || idByName.get(w.name)?.toString();
        if (!id || !w.name) return null;   // name/id missing -> skip
        return { subjectId: id, name: w.name };
      }).filter(Boolean);

      update.subjects = selections; // may be [] to clear
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    return res.json({ message: 'Candidate updated', candidate });
  } catch (err) {
    console.error('updateCandidate error:', err);
    return res.status(500).json({ message: 'Failed to update candidate' });
  }
};

// ================= Delete a candidate (admin only) =================
export const deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // validate id
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate id' });
    }

    // hard delete
    const removed = await Candidate.findByIdAndDelete(candidateId);

    if (!removed) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    return res.json({ message: 'Candidate deleted', candidate: removed });
  } catch (err) {
    console.error('deleteCandidate error:', err);
    return res.status(500).json({ message: 'Failed to delete candidate' });
  }
};
