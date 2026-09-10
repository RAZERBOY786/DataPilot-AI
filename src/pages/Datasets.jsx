import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDatasets, getRows, deleteDataset as removeDataset } from '../api/datasets'
import { getProfiles } from '../api/profiling'
import { useSettings } from '../context/SettingsContext'
import { maskValue } from '../utils/mask'

const TYPE_BADGE = {
  numeric: 'bg-primary/10 text-primary',
  string: 'bg-secondary/10 text-secondary',
  datetime: 'bg-status-warning/10 text-status-warning',
  boolean: 'bg-status-success/10 text-status-success',
}

export default function Datasets() {
  const [datasets, setDatasets] = useState([])
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailTab, setDetailTab] = useState('schema')
  const navigate = useNavigate()
  const { settings } = useSettings()

  const masking = Boolean(settings.dynamic_masking || settings.zdr_mode)
  const confidence = settings.confidence_threshold ?? 95
  const schemaGate = Boolean(settings.schema_verification)

  const fetchDatasets = async () => {
    setRefreshing(true)
    try {
      const d = await listDatasets()
      setDatasets(d || [])
    } catch { /* backend off */ }
    setRefreshing(false)
  }

  useEffect(() => { fetchDatasets() }, [])

  const deleteDataset = async (id, name) => {
    if (!window.confirm(`Delete "${name}" permanently?`)) return
    await removeDataset(id)
    if (detail?.id === id) setDetail(null)
    fetchDatasets()
  }

  const openDetail = async (d) => {
    setDetail({ ...d, schema: [], rows: [], loading: true })
    setDetailTab('schema')
    try {
      const [profiles, preview] = await Promise.all([
        getProfiles(d.id),
        getRows(d.id, 15),
      ])
      setDetail((cur) => cur && cur.id === d.id
        ? { ...cur, schema: profiles || [], rows: preview?.rows || [], previewCols: preview?.columns || [], loading: false }
        : cur)
    } catch {
      setDetail((cur) => cur && cur.id === d.id ? { ...cur, loading: false } : cur)
    }
  }

  const filtered = datasets.filter((d) => !query || d.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-on-surface tracking-tight">Datasets</h1>
          <p className="text-[14px] text-on-surface-variant">Manage, inspect, and version your datasets.</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button onClick={() => fetchDatasets()} disabled={refreshing} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-card text-on-surface border border-border-subtle text-[13px] font-semibold shadow-sm transition-colors hover:bg-surface-subtle disabled:opacity-50">
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={() => navigate('/upload')} className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container shadow-sm transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add_circle</span> Upload Dataset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Datasets', value: datasets.length },
          { label: 'Total Rows', value: datasets.reduce((s, d) => s + (d.row_count || 0), 0).toLocaleString() },
          { label: 'Total Columns', value: datasets.reduce((s, d) => s + (d.column_count || 0), 0) },
          { label: 'Storage Used', value: (datasets.reduce((s, d) => s + (d.file_size || 0), 0) / 1024 / 1024).toFixed(1) + ' MB' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-surface-card shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase text-on-surface-variant">{s.label}</span>
            <span className="text-[20px] font-mono font-bold text-on-surface">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-surface-card shadow-sm">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search datasets by name..." className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-subtle text-[13px] text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-[32px] text-outline block mb-2">inbox</span>
          <span className="text-[14px] font-semibold text-on-surface block">No datasets yet</span>
          <span className="text-[13px] text-on-surface-variant">Upload your first dataset to get started.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <div key={d.id} className="p-5 rounded-xl bg-surface-card shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-display font-bold text-on-surface truncate">{d.name}</h3>
                    <span className="text-[12px] text-on-surface-variant">{d.status || 'raw'}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${(d.health_score || 0) >= confidence ? 'bg-status-success/10 text-status-success' : (d.health_score || 0) >= 50 ? 'bg-status-warning/10 text-status-warning' : 'bg-error/10 text-error'}`}>Health {d.health_score || 0}%</span>
              </div>
              {(d.health_score || 0) < confidence && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-warning/10 text-status-warning text-[11px] font-semibold">
                  <span className="material-symbols-outlined text-[13px]">gpp_maybe</span>
                  Below confidence threshold ({confidence}%)
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-surface-subtle text-center">
                <div><div className="text-[13px] font-semibold text-on-surface">{d.row_count || 0}</div><div className="text-[11px] text-on-surface-variant">Rows</div></div>
                <div><div className="text-[13px] font-semibold text-on-surface">{d.column_count || 0}</div><div className="text-[11px] text-on-surface-variant">Columns</div></div>
                <div><div className="text-[13px] font-semibold text-on-surface">{((d.file_size || 0) / 1024 / 1024).toFixed(1)}</div><div className="text-[11px] text-on-surface-variant">MB</div></div>
              </div>
              <div className="flex items-center justify-between text-[12px] text-on-surface-variant">
                <span>{d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Unknown'}</span>
                <button onClick={() => openDetail(d)} className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline">
                  View details <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle/50">
                <button onClick={() => fetchDatasets()} disabled={refreshing} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle text-on-surface-variant text-[12px] font-semibold hover:text-primary hover:bg-surface-container-low transition-colors disabled:opacity-50">
                  <span className={`material-symbols-outlined text-[15px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                  Refresh
                </button>
                <button onClick={() => deleteDataset(d.id, d.name)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/5 text-error/80 text-[12px] font-semibold hover:bg-error/10 hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border-subtle/50 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-[20px] text-on-surface">{detail.name}</h2>
                  {schemaGate && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-status-success/10 text-status-success text-[11px] font-bold">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      Schema verified
                    </span>
                  )}
                  {(detail.health_score || 0) < confidence && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-status-warning/10 text-status-warning text-[11px] font-bold">
                      <span className="material-symbols-outlined text-[13px]">gpp_maybe</span>
                      Below confidence
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-on-surface-variant mt-1">
                  {detail.row_count || 0} rows · {detail.column_count || 0} columns · {((detail.file_size || 0) / 1024 / 1024).toFixed(2)} MB · health {detail.health_score || 0}%
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            {masking && (
              <div className="flex items-center gap-1.5 px-5 py-2 bg-status-warning/5 text-status-warning text-[11px] font-semibold border-b border-border-subtle/50">
                <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                Dynamic masking & ZDR active — sensitive values below are masked.
              </div>
            )}
            <div className="flex gap-2 px-5 pt-4 border-b border-border-subtle/50">
              {[['schema', 'Schema & Quality'], ['preview', 'Data Preview']].map(([key, label]) => (
                <button key={key} onClick={() => setDetailTab(key)} className={`px-4 py-2 rounded-t-lg text-[13px] font-semibold -mb-px border-b-2 transition-colors ${detailTab === key ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {detail.loading ? (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-[28px] text-outline animate-spin inline-block">progress_activity</span>
                  <div className="text-[13px] text-on-surface-variant mt-2">Loading profile data...</div>
                </div>
              ) : detailTab === 'schema' ? (
                detail.schema.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-on-surface-variant">No schema data available for this dataset.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] uppercase text-on-surface-variant border-b border-border-subtle/60">
                          <th className="py-2 pr-3">Column</th>
                          <th className="py-2 pr-3">Type</th>
                          <th className="py-2 pr-3 text-right">Distinct</th>
                          <th className="py-2 pr-3 text-right">Missing</th>
                          <th className="py-2 pr-3 text-right">Missing %</th>
                          <th className="py-2">Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.schema.map((p) => (
                          <tr key={p.id || p.column_name} className="border-b border-border-subtle/30 text-[13px]">
                            <td className="py-2.5 pr-3 font-semibold text-on-surface">{p.column_name}</td>
                            <td className="py-2.5 pr-3">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${TYPE_BADGE[p.data_type] || 'bg-surface-subtle text-on-surface-variant'}`}>{p.data_type}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono text-on-surface">{p.distinct_count}</td>
                            <td className="py-2.5 pr-3 text-right font-mono text-on-surface">{p.missing_count}</td>
                            <td className={`py-2.5 pr-3 text-right font-mono ${p.missing_pct > 30 ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{p.missing_pct}%</td>
                            <td className="py-2.5 text-on-surface-variant capitalize">{p.distribution_type.replace('_', ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                detail.rows && detail.rows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="text-[11px] uppercase text-on-surface-variant border-b border-border-subtle/60">
                          {detail.previewCols?.map((c) => (
                            <th key={c.name} className="py-2 pr-3 font-semibold">{c.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.rows.map((row, i) => (
                          <tr key={i} className="border-b border-border-subtle/30">
                            {detail.previewCols?.map((c) => (
                              <td key={c.name} className="py-2 pr-3 text-on-surface">{row[c.name] === null || row[c.name] === undefined ? <span className="text-outline italic">null</span> : masking ? String(maskValue(c.name, row[c.name], settings.masking_rules)) : String(row[c.name])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="py-3 text-center text-[12px] text-on-surface-variant">Showing first {detail.rows.length} rows</div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[13px] text-on-surface-variant">No row preview available.</div>
                )
              )}
            </div>
            <div className="p-4 border-t border-border-subtle/50 flex justify-end gap-3">
              <button onClick={() => { setDetail(null); navigate('/profiling') }} className="px-4 py-2 rounded-lg bg-surface-subtle text-[13px] font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
                Open in Profiling
              </button>
              <button onClick={() => setDetail(null)} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}