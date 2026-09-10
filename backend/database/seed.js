import { initDB, getDB } from './db.js'
import bcrypt from 'bcryptjs'

initDB()
const db = getDB()

const passwordHash = bcrypt.hashSync('password123', 10)

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@datapilot.corp')
if (!existing) {
  const result = db.prepare(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run('admin@datapilot.corp', 'Admin', passwordHash, 'admin')

  const userId = result.lastInsertRowid

  db.prepare(
    'INSERT INTO workspace_settings (user_id) VALUES (?)'
  ).run(userId)

  console.log(`Seeded admin user (id: ${userId}) with password: password123`)
} else {
  console.log('Admin user already exists, skipping seed')
}
