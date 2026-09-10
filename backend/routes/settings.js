import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getDB } from '../database/db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/workspace', (req, res) => {
  const db = getDB()
  let settings = db.prepare('SELECT * FROM workspace_settings WHERE user_id = ?').get(req.user.id)
  if (!settings) {
    db.prepare('INSERT INTO workspace_settings (user_id) VALUES (?)').run(req.user.id)
    settings = db.prepare('SELECT * FROM workspace_settings WHERE user_id = ?').get(req.user.id)
  }
  res.json(settings)
})

router.put('/workspace', (req, res) => {
  const { llm_engine, temperature, confidence_threshold, zdr_mode, schema_verification, pyodide_sandbox, hipaa_shield, dynamic_masking } = req.body
  const db = getDB()

  db.prepare(
    `UPDATE workspace_settings SET
      llm_engine = COALESCE(?, llm_engine),
      temperature = COALESCE(?, temperature),
      confidence_threshold = COALESCE(?, confidence_threshold),
      zdr_mode = COALESCE(?, zdr_mode),
      schema_verification = COALESCE(?, schema_verification),
      pyodide_sandbox = COALESCE(?, pyodide_sandbox),
      hipaa_shield = COALESCE(?, hipaa_shield),
      dynamic_masking = COALESCE(?, dynamic_masking)
    WHERE user_id = ?`
  ).run(llm_engine, temperature, confidence_threshold, zdr_mode, schema_verification, pyodide_sandbox, hipaa_shield, dynamic_masking, req.user.id)

  const updated = db.prepare('SELECT * FROM workspace_settings WHERE user_id = ?').get(req.user.id)
  res.json(updated)
})

router.get('/team', (req, res) => {
  const db = getDB()
  const members = db.prepare(
    'SELECT * FROM team_members WHERE workspace_owner_id = ?'
  ).all(req.user.id)
  res.json(members)
})

router.post('/team/invite', (req, res) => {
  const { email, role } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  const db = getDB()
  const existing = db.prepare(
    'SELECT id FROM team_members WHERE workspace_owner_id = ? AND email = ?'
  ).get(req.user.id, email)
  if (existing) return res.status(409).json({ error: 'Member already invited' })

  const result = db.prepare(
    'INSERT INTO team_members (workspace_owner_id, email, role) VALUES (?, ?, ?)'
  ).run(req.user.id, email, role || 'data_analyst')

  const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(member)
})

router.delete('/team/:id', (req, res) => {
  const db = getDB()
  const result = db.prepare(
    'DELETE FROM team_members WHERE id = ? AND workspace_owner_id = ?'
  ).run(req.params.id, req.user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Member not found' })
  res.json({ deleted: true })
})

router.get('/api-keys', (req, res) => {
  const db = getDB()
  const keys = db.prepare(
    'SELECT id, name, key_prefix, scopes, is_active, created_at FROM api_keys WHERE user_id = ?'
  ).all(req.user.id)
  res.json(keys)
})

router.post('/api-keys', (req, res) => {
  const { name, scopes } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const rawKey = 'dp_' + uuidv4().replace(/-/g, '')
  const keyHash = bcrypt.hashSync(rawKey, 10)
  const keyPrefix = rawKey.slice(0, 12) + '...'

  const db = getDB()
  const result = db.prepare(
    'INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, name, keyHash, keyPrefix, JSON.stringify(scopes || []))

  res.status(201).json({ id: result.lastInsertRowid, name, key: rawKey, key_prefix: keyPrefix })
})

router.delete('/api-keys/:id', (req, res) => {
  const db = getDB()
  const result = db.prepare(
    'DELETE FROM api_keys WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Key not found' })
  res.json({ deleted: true })
})

router.get('/webhooks', (req, res) => {
  const db = getDB()
  const webhooks = db.prepare(
    'SELECT * FROM webhooks WHERE user_id = ?'
  ).all(req.user.id)
  res.json(webhooks)
})

router.post('/webhooks', (req, res) => {
  const { name, url, event } = req.body
  if (!name || !url || !event) return res.status(400).json({ error: 'Name, url, and event are required' })

  const db = getDB()
  const result = db.prepare(
    'INSERT INTO webhooks (user_id, name, url, event) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, name, url, event)

  const webhook = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(webhook)
})

router.delete('/webhooks/:id', (req, res) => {
  const db = getDB()
  const result = db.prepare(
    'DELETE FROM webhooks WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Webhook not found' })
  res.json({ deleted: true })
})

export default router
