import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getWorkspace, updateWorkspace } from '../api/settings'

const DEFAULT_SETTINGS = {
  temperature: 0.2,
  confidence_threshold: 95,
  zdr_mode: 1,
  schema_verification: 1,
  pyodide_sandbox: 1,
  hipaa_shield: 0,
  dynamic_masking: 1,
  masking_rules: {
    ssn: { label: 'SSN & National IDs', method: 'SHA-256 Hash' },
    email: { label: 'Email Addresses', method: 'Pseudonymize' },
    payment: { label: 'Payment / CVV', method: 'Hard Strip' },
    geo: { label: 'IP & Geo Data', method: 'Truncate Prefix' },
  },
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getWorkspace()
      .then((d) => {
        if (d) setSettings({ ...DEFAULT_SETTINGS, ...d })
        setLoaded(true)
      })
      .catch((err) => { setError(err.message); setLoaded(true) })
      .finally(() => setLoading(false))
  }, [])

  const update = useCallback(async (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    try {
      const saved = await updateWorkspace({
        temperature: next.temperature,
        confidence_threshold: next.confidence_threshold,
        zdr_mode: next.zdr_mode ? 1 : 0,
        schema_verification: next.schema_verification ? 1 : 0,
        pyodide_sandbox: next.pyodide_sandbox ? 1 : 0,
        hipaa_shield: next.hipaa_shield ? 1 : 0,
        dynamic_masking: next.dynamic_masking ? 1 : 0,
        masking_rules: next.masking_rules ?? {},
      })
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }, [settings])

  return (
    <SettingsContext.Provider value={{ settings, loading, loaded, error, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}