import { useState, useEffect } from 'react'
import { listDatasets, getDataset, deleteDataset as removeDataset } from '../api/datasets'
import { getProfiles } from '../api/profiling'
import { useSettings } from '../context/SettingsContext'

const TYPE_BADGE = {
  numeric: 'bg-primary/10 text-primary',
  string: 'bg-secondary/10 text-secondary',
  datetime: 'bg-status-warning/10 text-status-warning',
  boolean: 'bg-status-success/10 text-status-success',
}

const FLAG_RECOMMENDATIONS = {
  high_missing: { icon: 'water_drop', label: 'High missing rate', action: 'Consider imputation or flag for exclusion' },
  constant: { icon: 'straighten', label: 'Constant column', action: 'Zero variance — drop or verify data loading' },
  single_value: { icon: 'looks_one', label: 'Single value', action: 'No informational value — candidate for removal' },
  unique_values: { icon: 'pin', label: 'Unique values', action: 'Likely an ID/primary key — do not aggregate' },
  temporal_gaps: { icon: 'schedule', label: 'Temporal gaps', action: 'Irregular time coverage — check sampling window' },
}

export default function Profiling() {
  const [datasets, setDatasets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const { settings } = useSettings()
  const confidence = settings.confidence_threshold ?? 95

  const fetchDatasets = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const d = await listDatasets()
      setDatasets(d || [])
      if (!silent && d && d.length > 0 && !selectedId) setSelectedId(d[0].id)
    } catch {
      setDatasets([])
    }
    setRefreshing(false)
  }

  useEffect(() => { fetchDatasets(true) }, [])

  const loadProfiles = async (id) => {
    setSelectedId(id)
    setLoading(true)
    setError('')
    try {
      const [p, ds] = await Promise.all([getProfiles(id), getDataset(id)])
      setProfiles(p || [])
      setDetail(ds)
    } catch (err) {
      setProfiles([])
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (selectedId) loadProfiles(selectedId)
  }, [selectedId])

  const deleteDataset = async (id, name) => {
    if (!window.confirm(`Delete "${name}" permanently?`)) return
    await removeDataset(id)
    setSelectedId(null)
    setProfiles([])
    setDetail(null)
    fetchDatasets(true)
  }

  const selected = datasets.find((d) => d.id === selectedId)
  const missingFlags = profiles.filter((p) => (p.missing_pct || 0) > 0)
  const issueFlags = profiles.filter((p) => p.integrity_flags?.length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-on-surface tracking-tight">Data Profiling</h1>
          <p className="text-[14px] text-on-surface-variant">Automated distribution analysis, missingness patterns, and schema diagnostics.</p>
        </div>
        <div className="flex items-center gap-3 self-start w-full lg:w-auto">
          <select
            value={selectedId || ''}
            onChange={(e) => e.target.value && loadProfiles(Number(e.target.value))}
            className="flex-1 lg:flex-none lg:min-w-[240px] h-10 px-3 rounded-lg bg-surface-card text-[13px] text-on-surface border border-border-subtle shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>{datasets.length === 0 ? 'No datasets available' : 'Select a dataset...'}</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.row_count || 0} rows)</option>
            ))}
          </select>
          <button onClick={() => fetchDatasets()} disabled={refreshing} className="flex items-center gap-2 px-4 h-10 rounded-lg bg-surface-card text-on-surface border border-border-subtle text-[13px] font-semibold shadow-sm transition-colors hover:bg-surface-subtle disabled:opacity-50">
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-[13px] text-error flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="rounded-xl bg-surface-card shadow-sm overflow-hidden">
          <div className="py-12 text-center">
            <span className="material-symbols-outlined text-[32px] text-outline block mb-2">analytics</span>
            <span className="text-[14px] font-semibold text-on-surface block">No datasets to profile</span>
            <span className="text-[13px] text-on-surface-variant">Upload a dataset and automated profiling will populate this page.</span>
          </div>
        </div>
      ) : (
        <>
          {selected && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              {[
                { label: 'Columns', value: selected.column_count || 0, sub: 'Schema columns' },
                { label: 'Rows', value: (selected.row_count || 0).toLocaleString(), sub: 'Profiled rows' },
                { label: 'Missing Cells', value: profiles.reduce((s, p) => s + (p.missing_count || 0), 0), sub: 'Across all columns' },
                { label: 'Quality Flags', value: issueFlags.length, sub: 'Integrity issues' },
                { label: 'Health Score', value: (selected.health_score || 0) + '%', sub: 'Overall quality' },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl bg-surface-card shadow-sm flex flex-col justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase text-on-surface-variant">{s.label}</span>
                  <div>
                    <div className="text-[24px] font-mono font-bold text-on-surface">{s.value}</div>
                    <div className="text-[12px] text-on-surface-variant mt-0.5">{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected && (selected.health_score || 0) < confidence && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-status-warning/10 border border-status-warning/25 text-status-warning">
              <span className="material-symbols-outlined text-[16px]">gpp_maybe</span>
              <span className="text-[12px] font-semibold">
                Health {(selected.health_score || 0)}% is below your confidence threshold ({confidence}%) — schedule a review in Settings before relying on automated insights.
              </span>
            </div>
          )}

          <div className="rounded-xl bg-surface-card shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-border-subtle/50">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[14px] text-on-surface">Data Dictionary</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-bold">{selected ? selected.column_count || 0 : 0} columns</span>
              </div>
              <div className="flex items-center gap-3">
                {selected && (
                  <button onClick={() => deleteDataset(selected.id, selected.name)} className="flex items-center gap-1 text-[12px] font-semibold text-error/80 hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    Delete dataset
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-[28px] text-outline animate-spin inline-block">progress_activity</span>
                <div className="text-[13px] text-on-surface-variant mt-2">Profiling dataset...</div>
              </div>
            ) : profiles.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-on-surface-variant">No profile data for this dataset yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] uppercase text-on-surface-variant border-b border-border-subtle/60">
                      <th className="py-3 px-4">Column</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2 text-right">Distinct</th>
                      <th className="py-3 px-2 text-right">Missing</th>
                      <th className="py-3 px-2">Missing %</th>
                      <th className="py-3 px-4">Stats</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => {
                      const s = p.stats_json || {}
                      const statsStr = p.data_type === 'numeric'
                        ? `min ${s.min ?? '—'} · max ${s.max ?? '—'} · mean ${s.mean ?? '—'}`
                        : s.min_length != null
                          ? `len ${s.min_length ?? '—'}–${s.max_length ?? '—'} · ${s.unique ?? 0} uniq`
                          : '—'
                      return (
                        <tr key={p.id} className="border-b border-border-subtle/30 text-[13px]">
                          <td className="py-2.5 px-4 font-semibold text-on-surface">
                            <div className="flex items-center gap-2">
                              {p.column_name}
                              {p.integrity_flags?.includes('high_missing') && <span className="material-symbols-outlined text-[15px] text-error" title="High missing">warning</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${TYPE_BADGE[p.data_type] || 'bg-surface-subtle text-on-surface-variant'}`}>{p.data_type}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-on-surface">{p.distinct_count}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-on-surface">{p.missing_count}</td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${p.missing_pct > 30 ? 'bg-error' : p.missing_pct > 10 ? 'bg-status-warning' : 'bg-status-success'}`} style={{ width: `${Math.min(100, p.missing_pct)}%` }}></div>
                              </div>
                              <span className={`font-mono text-[12px] ${p.missing_pct > 30 ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{p.missing_pct}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-[12px] text-on-surface-variant whitespace-nowrap">{statsStr}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-surface-card shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary text-[20px]">grid_on</span>
                <h2 className="font-display font-bold text-[14px] text-on-surface">Missingness Matrix</h2>
              </div>
              {missingFlags.length === 0 ? (
                <div className="p-4 rounded-lg bg-surface-subtle flex items-center justify-center">
                  <span className="text-[13px] text-on-surface-variant">No missing values detected in this dataset.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {missingFlags.slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-40 truncate text-[12px] text-on-surface-variant">{p.column_name}</span>
                      <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.missing_pct > 30 ? 'bg-error' : p.missing_pct > 10 ? 'bg-status-warning' : 'bg-secondary'}`} style={{ width: `${Math.min(100, p.missing_pct)}%` }}></div>
                      </div>
                      <span className={`w-14 text-right font-mono text-[12px] ${p.missing_pct > 30 ? 'text-error font-semibold' : 'text-on-surface-variant'}`}>{p.missing_pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-surface-card shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary text-[20px]">auto_awesome</span>
                <h2 className="font-display font-bold text-[14px] text-on-surface">Schema Optimization</h2>
              </div>
              {issueFlags.length === 0 ? (
                <div className="p-4 rounded-lg bg-surface-subtle flex items-center justify-center">
                  <span className="text-[13px] text-on-surface-variant">No optimization issues detected. Schema looks healthy.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {issueFlags.slice(0, 6).map((p) => {
                    const flag = FLAG_RECOMMENDATIONS[p.integrity_flags[0]] || { icon: 'info', label: p.integrity_flags[0].replace('_', ' '), action: 'Review this column' }
                    return (
                      <div key={p.id} className="p-3 rounded-lg bg-surface-subtle flex items-start gap-3">
                        <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">{flag.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-on-surface">{p.column_name}</span>
                          <span className="text-[12px] text-on-surface-variant capitalize">{flag.label}</span>
                          <span className="text-[12px] text-primary mt-0.5">{flag.action}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}