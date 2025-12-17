import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import connectDB from './config/db.js'

import generalRoutes from './routes/generalRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import adminSubjectRoutes from './routes/adminSubjectRoutes.js';
import candidateRoutes from './routes/candidateRoutes.js'
import testRoutes from './routes/testRoutes.js'
import candidateTestRoutes from './routes/candidateTestRoutes.js'
import candidateQueryRoutes from './routes/candidateQueryRoutes.js'
import adminPracticeRoutes from './routes/adminPracticeroutes.js';
import adminSubjecttestRoutes from './routes/adminSubjecttestRoutes.js';


dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()


app.use(cors({
  origin: '*'
}));


const buildpath = path.join(__dirname,"dist")
app.use(express.static(buildpath));




// ✅ Serve frontend if not hitting API
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

// Static uploads (empty at start)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', time: new Date().toISOString() })
})

// Mount routes
app.use('/api', generalRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/candidates', candidateRoutes);
app.use('/api/admin-test', testRoutes)
app.use('/api/admin-subject', adminSubjectRoutes)
app.use('/api/admin-practice', adminPracticeRoutes);
app.use('/api/candidate-test', candidateTestRoutes)
app.use('/api/admin/subject-test', adminSubjecttestRoutes);



app.use('/api/candidate', candidateRoutes)

app.use('/api/candidate-query', candidateQueryRoutes)


const PORT = process.env.PORT || 5000

// Try connect DB if URI provided
if (process.env.MONGO_URI) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  }).catch((err) => {
    console.error('DB connection failed, starting server without DB:', err?.message || err)
    app.listen(PORT, () => console.log(`Server running on port ${PORT} (no DB)`))
  })
} else {
  console.warn('MONGO_URI not set — starting server without DB')
  app.listen(PORT, () => console.log(`Server running on port ${PORT} (no DB)`))
}
