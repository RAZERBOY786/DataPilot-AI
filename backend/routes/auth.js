import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getDB } from '../database/db.js'
import { generateToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { email, name, password } = req.body
  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Email, name, and password are required' })
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const db = getDB()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const passwordHash = bcrypt.hashSync(password, 10)
  const result = db.prepare(
    'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
  ).run(email, name, passwordHash)

  const user = { id: result.lastInsertRowid, email, name, role: 'data_analyst' }
  db.prepare('INSERT INTO workspace_settings (user_id) VALUES (?)').run(user.id)

  const token = generateToken(user)
  res.status(201).json({ token, user: { id: user.id, email, name, role: user.role } })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  const db = getDB()
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = generateToken(user)
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

router.get('/me', (req, res) => {
  const db = getDB()
  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user?.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

export default router
