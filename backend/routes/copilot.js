import { Router } from 'express'
import { getDB } from '../database/db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/conversations', (req, res) => {
  const db = getDB()
  const conversations = db.prepare(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id)
  res.json(conversations)
})

router.post('/conversations', (req, res) => {
  const { dataset_id, title } = req.body
  const db = getDB()
  const result = db.prepare(
    'INSERT INTO conversations (user_id, dataset_id, title) VALUES (?, ?, ?)'
  ).run(req.user.id, dataset_id || null, title || 'New Analysis')

  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(conversation)
})

router.get('/conversations/:id/messages', (req, res) => {
  const db = getDB()
  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at'
  ).all(req.params.id)
  res.json(messages)
})

router.post('/conversations/:id/messages', (req, res) => {
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'Content is required' })

  const db = getDB()
  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(req.params.id, 'user', content)

  const aiResponse = `I received your question about the data. This is a placeholder response - connect a Gemini API key in settings to enable real AI responses.`
  db.prepare(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
  ).run(req.params.id, 'assistant', aiResponse)

  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at'
  ).all(req.params.id)
  res.json(messages)
})

router.delete('/conversations/:id', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id)
  const result = db.prepare(
    'DELETE FROM conversations WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Conversation not found' })
  res.json({ deleted: true })
})

export default router
