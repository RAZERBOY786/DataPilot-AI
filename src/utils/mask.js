const PATTERNS = {
  ssn: /(ssn|social|national\s*id|nid|id_number|aadhaar)/i,
  email: /(email|mail|e_?mail)/i,
  payment: /(card|cvv|ccv|payment|account|iban|bank)/i,
  geo: /(^ip$|ip_addr|geo|lat|lon|longitude|latitude|mac)/i,
}

function categoryOf(columnName) {
  for (const [cat, re] of Object.entries(PATTERNS)) {
    if (re.test(columnName)) return cat
  }
  return null
}

function shortHash(str) {
  let h = 0
  for (let i = 0; i < String(str).length; i++) h = (Math.imul(31, h) + String(str).charCodeAt(i)) | 0
  return Math.abs(h).toString(16).slice(0, 6)
}

function applyMethod(value, method) {
  const s = String(value ?? '')
  if (!s) return '—'
  switch (method) {
    case 'SHA-256 Hash':
      return s.length >= 4 ? `${shortHash(s)}${s.slice(-4)}` : shortHash(s)
    case 'Pseudonymize':
      return `user_${shortHash(s)}`
    case 'Hard Strip':
      return '••••'
    case 'Truncate Prefix':
      return s.length <= 6 ? '***' : `***${s.slice(-3)}`
    default:
      return '••••'
  }
}

export function maskValue(columnName, value, rules) {
  const cat = categoryOf(columnName)
  if (!cat) return value
  const rule = (rules && rules[cat]) || {}
  if (rule.method && rule.method !== 'None') return applyMethod(value, rule.method)
  return value
}