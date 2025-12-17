import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import Subject from '../models/Subject.js';
import jwt from 'jsonwebtoken';

//1.========== register candidate controller ==========*
export const registerCandidate = async (req, res) => {
  try {
    const {
      parentEmail,
      parentPhoneE164,
      country,
      name,
      // FE still sends these; we'll normalize them:
      subjects,                 // array of names (optional)
      subjectIds: rawIds = [],  // array of ids (optional)
      method,
      password,
      username,
    } = req.body;

    // Basic guards
    if (!password || /\s/.test(password)) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    if (typeof username === 'string' && /\s/.test(username)) {
      return res.status(400).json({ message: 'Invalid username' });
    }
    if (username) {
      const u = String(username).trim();
      const bad = !/^[a-zA-Z0-9._-]{3,20}$/.test(u);
      if (bad) return res.status(400).json({ message: 'Invalid username' });

      const clash = await Candidate.exists({
        username: { $regex: new RegExp(`^${esc(u)}$`, 'i') },
      });
      if (clash) return res.status(409).json({ message: 'Username already taken' });
    }
    if (!parentEmail || !parentPhoneE164 || !country || !name || !method) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ---- Normalize and resolve subject selections ----
    const namesInput = Array.isArray(subjects) ? subjects.filter(Boolean) : [];
    const idsInput = Array.isArray(rawIds) ? rawIds.filter(Boolean) : [];

    // Collect unique ids (validated) and names
    const uniqueIdStrings = Array.from(
      new Set(
        idsInput
          .map(String)
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
      )
    );
    const uniqueNames = Array.from(new Set(namesInput.map(String)));

    // Query DB for any provided ids and/or names
    const query = [];
    if (uniqueIdStrings.length) query.push({ _id: { $in: uniqueIdStrings } });
    if (uniqueNames.length)     query.push({ name: { $in: uniqueNames } });

    let subjectsFromDb = [];
    if (query.length === 1) {
      subjectsFromDb = await Subject.find(query[0], { _id: 1, name: 1 }).lean();
    } else if (query.length > 1) {
      subjectsFromDb = await Subject.find({ $or: query }, { _id: 1, name: 1 }).lean();
    }

    const nameById = new Map(subjectsFromDb.map((d) => [String(d._id), d.name]));
    const idByName = new Map(subjectsFromDb.map((d) => [d.name, String(d._id)]));

    // Build final pairs without duplicates (prefer id as key)
    const pairs = [];
    const seenIds = new Set();

    // 1) From ids provided
    for (const idStr of uniqueIdStrings) {
      const nm = nameById.get(idStr);
      if (!nm) continue;
      if (seenIds.has(idStr)) continue;
      seenIds.add(idStr);
      pairs.push({ subjectId: idStr, name: nm });
    }

    // 2) From names provided (add any missing from ids)
    for (const nm of uniqueNames) {
      const idStr = idByName.get(nm);
      if (!idStr) continue;
      if (seenIds.has(idStr)) continue;
      seenIds.add(idStr);
      pairs.push({ subjectId: idStr, name: nm });
    }

    // Create the candidate
    const doc = await Candidate.create({
      parentEmail,
      parentPhoneE164,
      country,
      name,
      username,
      // NEW: single array with id+name pairs
      subjects: pairs.map((p) => ({
        subjectId: new mongoose.Types.ObjectId(p.subjectId),
        name: p.name,
      })),
      method,
      passwordHash,
      passwordPlain: password,
    });

    // Useful response (keeps your previous shape + new shape)
    return res.status(201).json({
      message: 'Candidate registered',
      candidateId: doc._id,
      subjects: doc.subjects,                          // [{subjectId, name}]
      subjectIds: doc.subjects.map((s) => s.subjectId), // compatibility
      subjectNames: doc.subjects.map((s) => s.name),    // compatibility
    });
  } catch (err) {
    console.error('Candidate register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


// escape for regex equality (case-insensitive compare)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//2.========== unique username for each candidate controller ==========*
export const checkUsername = async (req, res) => {
  try {
    const raw = String(req.query.u || '').trim();
    // simple allowlist: letters, numbers, underscore, dash. 3..20 chars
    const ok = /^[a-zA-Z0-9_-]{3,20}$/.test(raw);
    if (!ok) return res.status(400).json({ available: false, reason: 'invalid' });

    const exists = await Candidate.exists({
      username: { $regex: new RegExp(`^${esc(raw)}$`, 'i') },
    });

    const makeSuggestions = (base) => {
      const b = base.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'user';
      const nums = () => Math.floor(100 + Math.random() * 900); // 3 digits
      const alts = new Set();
      while (alts.size < 5) {
        const pick = [
  `${b}${nums()}`,
  `${b}_${nums()}`,
  `${b}-${nums()}`,
  `${b}${new Date().getFullYear() % 100}`,
  `${b}_${new Date().getFullYear() % 100}`, // extra variant to keep 5 options
][Math.floor(Math.random() * 5)];
        if (pick.toLowerCase() !== raw.toLowerCase()) alts.add(pick);
      }
      return [...alts];
    };

    if (exists) {
      return res.json({
        available: false,
        reason: 'taken',
        suggestions: makeSuggestions(raw),
      });
    }
    return res.json({ available: true });
  } catch (e) {
    return res.status(500).json({ available: false, reason: 'error' });
  }
};

// 3) Public – minimal subject options for signup chips for admin and user both.
export const getPublicSubjectOptions = async (req, res) => {
  try {
    const docs = await Subject.find({}, { name: 1 }).sort({ name: 1 });
    return res.json({
      count: docs.length,
      subjects: docs.map(d => ({ _id: d._id, name: d.name })),
    });
  } catch (err) {
    console.error('getPublicSubjectOptions error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// 4) ---------- Candidate Login (email OR username) ----------
export const loginCandidate = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || '').trim(); // email OR username
    const password = String(req.body.password || '');

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // Case-insensitive match for username, lower-cased match for email
    const cand = await Candidate.findOne({
      $or: [
        { parentEmail: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${esc(identifier)}$`, 'i') } },
      ],
    }).lean();

    // Uniform error to avoid user enumeration
    if (!cand) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, cand.passwordHash || '');
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { role: 'candidate', candidateId: String(cand._id) },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // sanitize
    const safe = {
      _id: cand._id,
      name: cand.name,
      username: cand.username,
      parentEmail: cand.parentEmail,
      country: cand.country,
      method: cand.method,
      subjects: cand.subjects || [],
      createdAt: cand.createdAt,
      updatedAt: cand.updatedAt,
    };

    return res.json({ message: 'Login successful', token, candidate: safe });
  } catch (err) {
    console.error('loginCandidate error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// 5) ---------- Who am I ----------
export const candidateMe = async (req, res) => {
  try {
    const me = await Candidate.findById(req.candidateId)
      .select('_id name username parentEmail country method subjects createdAt updatedAt testResults')
      .lean();

    if (!me) return res.status(404).json({ message: 'Candidate not found' });
    return res.json({ candidate: me });
  } catch (err) {
    console.error('candidateMe error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// 6) ---------- My Subjects (candidate-only) ----------
export const getMySubjects = async (req, res) => {
  try {
    const me = await Candidate.findById(req.candidateId)
      .select('subjects.subjectId')
      .lean();

    if (!me) return res.status(404).json({ message: 'Candidate not found' });

    const ids = (me.subjects || []).map(s => s?.subjectId).filter(Boolean);
    if (!ids.length) return res.json({ count: 0, subjects: [] });

    // order maintain करने के लिए map
    const order = new Map(ids.map((id, i) => [String(id), i]));

    // ⬇️ Projection हटाया — अब पूरा subject object आएगा (chapters, topics, pdfPath, videoPath, timestamps, आदि)
    const docs = await Subject.find({ _id: { $in: ids } }).lean();

    // subscriptions के original order में sort
    docs.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));

    // पूरे documents वापस कर दो
    return res.json({ count: docs.length, subjects: docs });
  } catch (err) {
    console.error('getMySubjects error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

