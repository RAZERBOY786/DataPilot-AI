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

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use('/uploads', express.static('uploads'))

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
