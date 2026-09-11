import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

// Never hard-code the signing key in source. Use the JWT_SECRET env variable,
// or fall back to a random per-process secret so no published key can be used
// to forge sessions.
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')

export function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}
