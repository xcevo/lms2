import { Router } from 'express'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'LMS API root (placeholder)',
    endpoints: [
      '/api/health',
      '/api/admin',
      '/api/training',
      '/api/candidate',
      '/api/test',
      '/api/candidate-test',
      '/api/candidate-query',
      '/api/certificate',
    ]
  })
})

export default router
