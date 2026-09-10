const CANDIDATES = [
  import.meta.env.VITE_API_URL || 'https://datapilot-ai-debdut-nandy.onrender.com',
  'http://localhost:8000',
].filter(Boolean)

let activeBase = null

async function handle(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') msg = data.detail
      else if (data.detail) msg = JSON.stringify(data.detail)
    } catch {
      // keep default message
    }
    throw new Error(msg)
  }
  if (res.status === 204) return null
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  if (!activeBase) {
    for (const base of CANDIDATES) {
      try {
        const probe = await fetch(`${base}/api/health`, { method: 'GET', signal: AbortSignal.timeout(6000) })
        if (probe.ok) {
          activeBase = base
          break
        }
      } catch {
        continue
      }
    }
    activeBase = activeBase || null
  }

  const base = activeBase
  if (!base) {
    throw new Error(`Cannot reach any backend (${CANDIDATES.join(', ')}). Start one and retry.`)
  }

  const opts = { method, headers: { ...headers } }
  if (body !== undefined) {
    if (body instanceof FormData) {
      opts.body = body
    } else {
      opts.headers['Content-Type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
  }

  let res
  try {
    res = await fetch(`${base}/api${path}`, opts)
  } catch {
    activeBase = null
    throw new Error(`Cannot reach backend at ${base}. Start it and retry.`)
  }
  return handle(res)
}

export function uploadUrl(path) {
  const base = activeBase || CANDIDATES[0]
  return `${base}/api${path}`
}

export * as datasetsApi from './datasets'
export * as profilingApi from './profiling'
export * as copilotApi from './copilot'
export * as settingsApi from './settings'
export * as statsApi from './stats'