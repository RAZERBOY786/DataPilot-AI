import express from 'express'
import cors from 'cors'
import { initDB } from './database/db.js'
import authRoutes from './routes/auth.js'
import datasetRoutes from './routes/datasets.js'
import profileRoutes from './routes/profiles.js'
import copilotRoutes from './routes/copilot.js'
import settingsRoutes from './routes/settings.js'

const app = express()
const PORT = process.env.PORT || 3001

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))

// ── Security headers + naive per-IP rate limiting ──
const RATE = new Map()
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('X-Frame-Options', 'DENY')
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (req.secure) res.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown'
  const now = Date.now()
  const recent = (RATE.get(ip) || []).filter((t) => now - t < 60_000)
  if (recent.length >= 60) {
    return res.status(429).json({ error: 'Too many requests' })
  }
  recent.push(now)
  RATE.set(ip, recent)
  if (RATE.size > 10_000) RATE.clear()
  next()
})

// ── Static files are never served publicly; keep uploads off root ──
app.use('/api/auth', authRoutes)
app.use('/api/datasets', datasetRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/copilot', copilotRoutes)
app.use('/api/settings', settingsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

initDB()

app.listen(PORT, () => {
  console.log(`DataPilot API running on http://localhost:${PORT}`)
})