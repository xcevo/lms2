import jwt from 'jsonwebtoken';

export default function candidateAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.role !== 'candidate' || !payload?.candidateId) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.candidateId = payload.candidateId; // isolate candidate's own data
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
