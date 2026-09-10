import { Router } from 'express'
import { getDB } from '../database/db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()
router.use(authenticate)

router.get('/dataset/:datasetId', (req, res) => {
  const db = getDB()
  const profiles = db.prepare(
    'SELECT * FROM profiles WHERE dataset_id = ? ORDER BY id'
  ).all(req.params.datasetId)
  res.json(profiles)
})

router.post('/dataset/:datasetId', (req, res) => {
  const { column_name, data_type, distinct_count, missing_count, missing_pct, stats_json, distribution_type, integrity_flags } = req.body

  const db = getDB()
  const result = db.prepare(
    `INSERT INTO profiles (dataset_id, column_name, data_type, distinct_count, missing_count, missing_pct, stats_json, distribution_type, integrity_flags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.params.datasetId,
    column_name,
    data_type,
    distinct_count || 0,
    missing_count || 0,
    missing_pct || 0,
    JSON.stringify(stats_json || {}),
    distribution_type || 'unknown',
    JSON.stringify(integrity_flags || [])
  )

  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(profile)
})

router.delete('/:id', (req, res) => {
  const db = getDB()
  const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Profile not found' })
  res.json({ deleted: true })
})

router.delete('/dataset/:datasetId', (req, res) => {
  const db = getDB()
  db.prepare('DELETE FROM profiles WHERE dataset_id = ?').run(req.params.datasetId)
  res.json({ deleted: true })
})

export default router
