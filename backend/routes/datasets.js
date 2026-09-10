import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDB } from '../database/db.js'
import { authenticate } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 1024 * 1024 * 102 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.json', '.parquet', '.sqlite']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

const router = Router()
router.use(authenticate)

router.get('/', (req, res) => {
  const db = getDB()
  const datasets = db.prepare(
    'SELECT * FROM datasets WHERE user_id = ? ORDER BY updated_at DESC'
  ).all(req.user.id)
  res.json(datasets)
})

router.get('/:id', (req, res) => {
  const db = getDB()
  const dataset = db.prepare(
    'SELECT * FROM datasets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id)
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' })
  res.json(dataset)
})

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const db = getDB()
  const result = db.prepare(
    `INSERT INTO datasets (user_id, name, file_path, file_size, status)
     VALUES (?, ?, ?, ?, 'raw')`
  ).run(req.user.id, req.file.originalname, req.file.path, req.file.size)

  const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(dataset)
})

router.post('/', (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required' })

  const db = getDB()
  const result = db.prepare(
    'INSERT INTO datasets (user_id, name) VALUES (?, ?)'
  ).run(req.user.id, name)

  const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(dataset)
})

router.put('/:id', (req, res) => {
  const { name, status, tags, health_score } = req.body
  const db = getDB()

  const dataset = db.prepare(
    'SELECT * FROM datasets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id)
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' })

  db.prepare(
    `UPDATE datasets SET
      name = COALESCE(?, name),
      status = COALESCE(?, status),
      tags = COALESCE(?, tags),
      health_score = COALESCE(?, health_score),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`
  ).run(name, status, tags, health_score, req.params.id)

  const updated = db.prepare('SELECT * FROM datasets WHERE id = ?').get(req.params.id)
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const db = getDB()
  const result = db.prepare(
    'DELETE FROM datasets WHERE id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Dataset not found' })
  res.json({ deleted: true })
})

export default router
