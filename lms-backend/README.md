# LMS Backend (Starter)

Minimal Express + MongoDB scaffold mirroring your previous backend's directory layout.
Only essentials are included so you can start quickly and fill in real logic later.

## Quick Start
```bash
npm install
cp .env.example .env
npm run dev
```
- Server runs on `http://localhost:${PORT:-5000}`.
- If `MONGO_URI` is not set, it will **skip** DB connection (still boots).

## Structure
```
config/           # db connection
controllers/      # placeholder controllers (TODO)
middleware/       # placeholder auth
models/           # placeholder mongoose models
routes/           # mounted under /api, /api/admin, etc.
uploads/          # static folder (served at /uploads)
utils/            # helper utilities (placeholder)
server.js         # app entry
```

## Next Steps
- Replace placeholder controllers/models with real logic.
- Add validation, auth, file uploads, etc. as needed.
