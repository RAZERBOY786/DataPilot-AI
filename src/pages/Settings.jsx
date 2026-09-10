import { useState, useEffect } from 'react'
import { useSettings } from '../context/SettingsContext'
import {
  listTeam,
  inviteMember as inviteMemberApi, removeMember as removeMemberApi,
  listApiKeys, createApiKey, deleteApiKey,
  listWebhooks, createWebhook, deleteWebhook,
} from '../api/settings'

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input checked={checked} onChange={onChange} className="sr-only peer" type="checkbox" />
      <div className="w-11 h-6 bg-surface-variant rounded-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
    </label>
  )
}

function Field({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface-subtle">
      <div className="flex flex-col">
        <span className="text-[13px] font-semibold text-on-surface">{label}</span>
        {desc && <span className="text-[11px] text-on-surface-variant mt-0.5">{desc}</span>}
      </div>
      {children}
    </div>
  )
}

function Section({ title, icon, accent = 'text-primary', usedIn, unsaved, children, footer }) {
  return (
    <div className="bg-surface-card rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-5 pb-3 border-b border-border-subtle/50">
        <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center">
          <span className={`material-symbols-outlined text-[20px] ${accent}`}>{icon}</span>
        </div>
        <div className="flex-1">
          <div className="font-display font-bold text-[15px] text-on-surface">{title}</div>
          {usedIn && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Used in:</span>
              {usedIn.map((u) => (
                <span key={u} className="px-1.5 py-0.5 rounded bg-surface-container text-primary text-[10px] font-bold">{u}</span>
              ))}
            </div>
          )}
        </div>
        {unsaved && <span className="px-2 py-1 rounded-md bg-status-warning/15 text-status-warning text-[10px] font-bold uppercase tracking-wide">Unsaved</span>}
      </div>
      <div className="p-5 flex flex-col gap-3">{children}</div>
      {footer && <div className="px-5 py-3 bg-surface-subtle/60 border-t border-border-subtle/40 flex items-center justify-end">{footer}</div>}
    </div>
  )
}

function SaveButton({ onClick, saved }) {
  const [flash, setFlash] = useState(false)
  return (
    <button
      onClick={async () => { const ok = await onClick(); if (ok?.ok) { setFlash(true); setTimeout(() => setFlash(false), 1600) } }}
      className={`px-5 h-9 rounded-lg text-[12px] font-bold transition-colors flex items-center gap-1.5 ${
        flash ? 'bg-status-success text-white' : 'bg-primary text-on-primary hover:bg-primary-container'
      }`}
    >
      <span className="material-symbols-outlined text-[15px]">{flash ? 'check_circle' : saved ? 'cloud_done' : 'save'}</span>
      {flash ? 'Synced' : saved ? 'Saved' : 'Save'}
    </button>
  )
}

const PII_METHODS = ['SHA-256 Hash', 'Pseudonymize', 'Hard Strip', 'Truncate Prefix', 'None']

export default function Settings() {
  const { settings, loading, update } = useSettings()
  const [activeTab, setActiveTab] = useState(0)

  const [temperature, setTemperature] = useState(settings.temperature)
  const [confidence, setConfidence] = useState(settings.confidence_threshold)
  const [hipaa, setHipaa] = useState(Boolean(settings.hipaa_shield))
  const [masking, setMasking] = useState(Boolean(settings.dynamic_masking))
  const [zdr, setZdr] = useState(Boolean(settings.zdr_mode))
  const [schemaGate, setSchemaGate] = useState(Boolean(settings.schema_verification))
  const [sandbox, setSandbox] = useState(Boolean(settings.pyodide_sandbox))
  const [rules, setRules] = useState(settings.masking_rules)

  const [team, setTeam] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('data_analyst')
  const [apiKeys, setApiKeys] = useState([])
  const [keyName, setKeyName] = useState('')
  const [webhooks, setWebhooks] = useState([])
  const [hookName, setHookName] = useState('')
  const [hookUrl, setHookUrl] = useState('')
  const [hookEvent, setHookEvent] = useState('dataset.uploaded')
  const [newKey, setNewKey] = useState(null)

  useEffect(() => {
    setTemperature(settings.temperature)
    setConfidence(settings.confidence_threshold)
    setHipaa(Boolean(settings.hipaa_shield))
    setMasking(Boolean(settings.dynamic_masking))
    setZdr(Boolean(settings.zdr_mode))
    setSchemaGate(Boolean(settings.schema_verification))
    setSandbox(Boolean(settings.pyodide_sandbox))
    setRules(settings.masking_rules)
  }, [settings])

  useEffect(() => {
    listTeam().then(setTeam).catch(() => {})
    listApiKeys().then(setApiKeys).catch(() => {})
    listWebhooks().then(setWebhooks).catch(() => {})
  }, [])

  const saveGeneral = () => update({ temperature, confidence_threshold: confidence })
  const savePrivacy = () => update({ hipaa_shield: hipaa ? 1 : 0, dynamic_masking: masking ? 1 : 0, zdr_mode: zdr ? 1 : 0, masking_rules: rules })
  const saveIntegrity = () => update({ schema_verification: schemaGate ? 1 : 0, pyodide_sandbox: sandbox ? 1 : 0 })

  const inviteMember = async () => {
    if (!inviteEmail) return
    const m = await inviteMemberApi(inviteEmail, inviteRole).catch(() => null)
    if (m) { setTeam((t) => [...t, m]); setInviteEmail('') }
  }
  const removeMember = async (id) => {
    await removeMemberApi(id).catch(() => {})
    setTeam((t) => t.filter((m) => m.id !== id))
  }
  const createKey = async () => {
    if (!keyName) return
    const data = await createApiKey(keyName).catch(() => null)
    if (data) { setNewKey(data.key); setApiKeys((k) => [...k, { id: data.id, name: data.name, key_prefix: data.key_prefix, is_active: 1 }]); setKeyName('') }
  }
  const deleteKey = async (id) => {
    await deleteApiKey(id).catch(() => {})
    setApiKeys((k) => k.filter((x) => x.id !== id))
  }
  const createHook = async () => {
    if (!hookName || !hookUrl) return
    const wh = await createWebhook(hookName, hookUrl, hookEvent).catch(() => null)
    if (wh) { setWebhooks((w) => [...w, wh]); setHookName(''); setHookUrl('') }
  }
  const deleteHook = async (id) => {
    await deleteWebhook(id).catch(() => {})
    setWebhooks((w) => w.filter((x) => x.id !== id))
  }

  const tabs = [
    { icon: 'tune', label: 'General' },
    { icon: 'security', label: 'Privacy & Security' },
    { icon: 'shield', label: 'Data Integrity' },
    { icon: 'group', label: 'Team' },
    { icon: 'key', label: 'Integrations' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display font-bold text-[28px] text-on-surface tracking-tight">Workspace Settings</h1>
        <p className="text-[14px] text-on-surface-variant flex items-center gap-2">
          Workspace-wide preferences, synced live across every page.
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${loading ? 'bg-surface-subtle text-on-surface-variant' : 'bg-status-success/10 text-status-success'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-outline' : 'bg-status-success'}`}></span>
            {loading ? 'Loading…' : 'Synced'}
          </span>
        </p>
      </div>

      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab, i) => (
          <button key={tab.label} onClick={() => setActiveTab(i)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 ${activeTab === i ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-card hover:bg-surface-subtle text-on-surface-variant shadow-sm'}`}>
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Model Temperature"
            icon="thermostat"
            usedIn={['DataPilot AI', 'Insights']}
            unsaved={temperature !== settings.temperature}
            footer={<SaveButton onClick={saveGeneral} saved={temperature === settings.temperature} />}
          >
            <p className="text-[12px] text-on-surface-variant">Controls how creative the AI engine is when answering questions. Lower = factual, higher = exploratory.</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-on-surface-variant">Response variability</span>
              <span className="font-mono text-[20px] font-bold text-primary">{Number(temperature).toFixed(2)}</span>
            </div>
            <input className="w-full accent-primary cursor-pointer h-2 bg-surface-variant rounded-lg" type="range" min="0" max="1" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
            <div className="flex justify-between text-[11px] text-on-surface-variant"><span>0.0 Deterministic</span><span>1.0 Creative</span></div>
          </Section>

          <Section
            title="Confidence Threshold"
            icon="gpp_maybe"
            accent="text-secondary"
            usedIn={['Profiling', 'Datasets']}
            unsaved={confidence !== settings.confidence_threshold}
            footer={<SaveButton onClick={saveGeneral} saved={confidence === settings.confidence_threshold} />}
          >
            <p className="text-[12px] text-on-surface-variant">Minimum health score before a dataset is flagged as high-confidence in Profiling and Datasets.</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-on-surface-variant">Auto-execution confidence</span>
              <span className="font-mono text-[20px] font-bold text-secondary">{confidence}%</span>
            </div>
            <input className="w-full accent-secondary cursor-pointer h-2 bg-surface-variant rounded-lg" type="range" min="70" max="99" step="1" value={confidence} onChange={(e) => setConfidence(parseInt(e.target.value, 10))} />
            <div className="flex justify-between text-[11px] text-on-surface-variant"><span>70% Permissive</span><span>99% Strict</span></div>
          </Section>
        </div>
      )}

      {activeTab === 1 && (
        <div className="flex flex-col gap-6">
          <Section
            title="PII Redaction Methods"
            icon="fingerprint"
            usedIn={['Datasets preview', 'Upload', 'Copilot']}
            unsaved={JSON.stringify(rules) !== JSON.stringify(settings.masking_rules)}
            accent={masking ? 'text-status-success' : 'text-error'}
            footer={<SaveButton onClick={savePrivacy} saved={JSON.stringify(rules) === JSON.stringify(settings.masking_rules)} />}
          >
            <Field
              label="Dynamic Column Masking"
              desc={masking ? 'On — sensitive columns are masked in every preview across the app.' : 'Off — previews show raw values.'}
            >
              <Toggle checked={masking} onChange={() => setMasking(!masking)} />
            </Field>
            {Object.entries(rules || {}).map(([cat, rule]) => (
              <div key={cat} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-surface-subtle">
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-on-surface">{rule.label}</span>
                  <span className="font-mono text-[11px] text-on-surface-variant mt-0.5">Matched by column name: {cat}</span>
                </div>
                <select
                  value={rule.method}
                  onChange={(e) => setRules((r) => ({ ...r, [cat]: { ...r[cat], method: e.target.value } }))}
                  className="h-9 px-2 rounded-lg bg-surface-card text-[12px] text-on-surface border border-border-subtle focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PII_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            ))}
          </Section>

          <Section
            title="Data Governance"
            icon="lock"
            usedIn={['App header', 'All pages']}
            unsaved={hipaa !== Boolean(settings.hipaa_shield) || zdr !== Boolean(settings.zdr_mode)}
            footer={<SaveButton onClick={savePrivacy} saved={hipaa === Boolean(settings.hipaa_shield) && zdr === Boolean(settings.zdr_mode)} />}
          >
            <Field label="HIPAA / BAA Policy Shield" desc="Shows a compliance shield in the app header when active.">
              <Toggle checked={hipaa} onChange={() => setHipaa(!hipaa)} />
            </Field>
            <Field label="Zero-Data-Retention (ZDR)" desc="When on, raw values are never shown after upload — previews are masked.">
              <Toggle checked={zdr} onChange={() => setZdr(!zdr)} />
            </Field>
          </Section>
        </div>
      )}

      {activeTab === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section
            title="Schema Verification Gate"
            icon="verified"
            usedIn={['Upload', 'Datasets']}
            accent="text-status-success"
            unsaved={schemaGate !== Boolean(settings.schema_verification)}
            footer={<SaveButton onClick={saveIntegrity} saved={schemaGate === Boolean(settings.schema_verification)} />}
          >
            <Field label="Verify schema on upload" desc="Shows the verified badge in Datasets details when on.">
              <Toggle checked={schemaGate} onChange={() => setSchemaGate(!schemaGate)} />
            </Field>
          </Section>

          <Section
            title="Execution Sandbox"
            icon="memory"
            usedIn={['DataPilot AI']}
            accent="text-secondary"
            unsaved={sandbox !== Boolean(settings.pyodide_sandbox)}
            footer={<SaveButton onClick={saveIntegrity} saved={sandbox === Boolean(settings.pyodide_sandbox)} />}
          >
            <Field label="Pyodide WebAssembly sandbox" desc="Copilot advertises sandboxed execution when active.">
              <Toggle checked={sandbox} onChange={() => setSandbox(!sandbox)} />
            </Field>
          </Section>
        </div>
      )}

      {activeTab === 3 && (
        <div className="flex flex-col gap-6">
          <Section title="Team Members" icon="badge">
            <div className="flex flex-col sm:flex-row gap-3">
              <input className="flex-1 h-10 px-3 rounded-lg bg-surface-subtle text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" placeholder="colleague@company.com" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="h-10 px-3 rounded-lg bg-surface-subtle text-[13px] text-on-surface focus:outline-none">
                <option value="data_analyst">Data Analyst</option>
                <option value="ml_engineer">ML Engineer</option>
                <option value="viewer">Viewer (Read-Only)</option>
                <option value="compliance_officer">Compliance Officer</option>
              </select>
              <button onClick={inviteMember} className="h-10 px-5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">person_add</span> Invite
              </button>
            </div>
            {team.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-on-surface-variant">No team members yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white text-[12px] font-bold">{m.email[0].toUpperCase()}</div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-on-surface">{m.email}</span>
                        <span className="text-[11px] text-on-surface-variant capitalize">{m.role.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <button onClick={() => removeMember(m.id)} className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {activeTab === 4 && (
        <div className="flex flex-col gap-6">
          <Section title="API Keys" icon="code">
            <div className="flex gap-3">
              <input className="flex-1 h-10 px-3 rounded-lg bg-surface-subtle text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Key name (e.g. CI Pipeline)" type="text" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              <button onClick={createKey} className="h-10 px-5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container transition-colors flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">add</span> Create</button>
            </div>
            {newKey && (
              <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/30 flex items-center justify-between">
                <span className="font-mono text-[13px] text-on-surface break-all">{newKey}</span>
                <button onClick={() => setNewKey(null)} className="text-on-surface-variant hover:text-on-surface ml-3"><span className="material-symbols-outlined text-[18px]">close</span></button>
              </div>
            )}
            {apiKeys.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-on-surface-variant">No API keys yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-primary">key</span>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-on-surface">{k.name}</span>
                        <span className="font-mono text-[11px] text-on-surface-variant">{k.key_prefix}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteKey(k.id)} className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section title="Webhooks" icon="webhook">
            <div className="flex flex-col sm:flex-row gap-3">
              <input className="flex-1 h-10 px-3 rounded-lg bg-surface-subtle text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Hook name" type="text" value={hookName} onChange={(e) => setHookName(e.target.value)} />
              <input className="flex-1 h-10 px-3 rounded-lg bg-surface-subtle text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary" placeholder="https://your-server.com/webhook" type="url" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
              <select value={hookEvent} onChange={(e) => setHookEvent(e.target.value)} className="h-10 px-3 rounded-lg bg-surface-subtle text-[13px] text-on-surface focus:outline-none">
                <option value="dataset.uploaded">Dataset Uploaded</option>
                <option value="dataset.profiled">Dataset Profiled</option>
                <option value="quality.alert">Quality Alert</option>
              </select>
              <button onClick={createHook} className="h-10 px-5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container transition-colors">Add</button>
            </div>
            {webhooks.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-on-surface-variant">No webhooks configured.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-on-surface">{w.name}</span>
                      <span className="font-mono text-[11px] text-on-surface-variant truncate max-w-md">{w.url}</span>
                      <span className="text-[11px] text-secondary mt-0.5">{w.event}</span>
                    </div>
                    <button onClick={() => deleteHook(w.id)} className="text-on-surface-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}