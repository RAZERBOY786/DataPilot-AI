import { useRef, useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { listDatasets, uploadDataset, deleteDataset as removeDataset } from '../api/datasets'
import { useSettings } from '../context/SettingsContext'

export default function Upload() {
  const fileInputRef = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [error, setError] = useState('')
  const [datasets, setDatasets] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchDatasets = async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const d = await listDatasets()
      setDatasets(d || [])
    } catch {
      setDatasets([])
    }
    setRefreshing(false)
  }

  useEffect(() => { fetchDatasets(true) }, [])

  const handleFiles = (e) => setSelectedFiles(Array.from(e.target.files))
  const openFilePicker = () => fileInputRef.current?.click()

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    setError('')
    const results = []
    for (const file of selectedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const r = await uploadDataset(formData)
        results.push(r)
      } catch (err) {
        setError(err.message)
      }
    }
    if (results.length > 0) setUploadResult(results[0])
    setUploading(false)
    setSelectedFiles([])
    if (results.length > 0) fetchDatasets(true)
  }

  const deleteDataset = async (id, name) => {
    if (!window.confirm(`Delete "${name}" permanently?`)) return
    await removeDataset(id)
    if (uploadResult?.id === id) setUploadResult(null)
    fetchDatasets(true)
  }

  const totalSize = datasets.reduce((s, d) => s + (d.file_size || 0), 0)
  const { settings } = useSettings()
  const privacyNotes = []
  if (settings.zdr_mode) privacyNotes.push('PII redacted & dropped after profiling (ZDR active)')
  if (settings.dynamic_masking) privacyNotes.push('Sensitive values masked in every preview')
  if (settings.pyodide_sandbox) privacyNotes.push('Processing executed in Pyodide sandbox')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-on-surface tracking-tight">Upload Data</h1>
          <p className="text-[14px] text-on-surface-variant">Ingest structured files with automated schema parsing and type inference.</p>
        </div>
        <button
          onClick={() => fetchDatasets()}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-card text-on-surface border border-border-subtle text-[13px] font-semibold shadow-sm transition-colors hover:bg-surface-subtle disabled:opacity-50 self-start"
        >
          <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-card shadow-sm flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant">Storage Used</span>
          <span className="text-[20px] font-mono font-bold text-on-surface-variant">{(totalSize / 1024 / 1024).toFixed(1)} MB</span>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (totalSize / 1024 / 1024 / 100) * 2)}%` }}></div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-surface-card shadow-sm flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant">Files Uploaded</span>
          <span className="text-[20px] font-mono font-bold text-on-surface-variant">{datasets.length}</span>
          <span className="text-[12px] text-on-surface-variant">{datasets.length === 0 ? 'No data yet' : 'Stored in workspace'}</span>
        </div>
        <div className="p-4 rounded-xl bg-surface-card shadow-sm flex flex-col gap-2">
          <span className="text-[11px] font-bold uppercase text-on-surface-variant">Supported Formats</span>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {['.CSV', '.XLSX', '.JSON', '.PARQUET', '.SQLITE'].map((f) => (
              <span key={f} className="px-2 py-0.5 rounded-md bg-surface-subtle text-[11px] font-semibold text-on-surface-variant">{f}</span>
            ))}
          </div>
        </div>
      </div>

      <section className="p-6 rounded-2xl bg-surface-card shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[16px] text-on-surface">Drop Zone</h2>
          <span className="text-[12px] text-on-surface-variant">Max 1 GB per file</span>
        </div>

        {privacyNotes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg bg-status-success/5 border border-status-success/20">
            <span className="material-symbols-outlined text-[16px] text-status-success">shield</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-semibold text-status-success">Privacy profile:</span>
              {privacyNotes.map((n) => (
                <span key={n} className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-on-surface-variant font-medium">{n}</span>
              ))}
              <NavLink to="/settings" className="text-[12px] text-primary font-semibold hover:underline">Change in Settings</NavLink>
            </div>
          </div>
        )}

        <div
          className="group relative rounded-xl bg-surface-canvas p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:bg-surface-container-low/40 border-2 border-dashed border-border-subtle hover:border-primary/40"
          onClick={openFilePicker}
        >
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[32px]">{uploading ? 'sync' : 'cloud_upload'}</span>
          </div>
          <span className="font-display font-bold text-[15px] text-on-surface">
            {uploading ? 'Uploading & profiling...' : 'Drag & drop files here or browse'}
          </span>
          <span className="text-[13px] text-on-surface-variant mt-1">CSV, XLSX, JSON, Parquet, SQLite</span>
          <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.xls,.json,.parquet,.sqlite" className="hidden" onChange={handleFiles} />
        </div>

        {selectedFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-on-surface">{selectedFiles.length} file(s) selected</span>
              <button onClick={() => setSelectedFiles([])} className="text-[12px] text-on-surface-variant hover:text-error">Clear</button>
            </div>
            <div className="flex flex-col gap-1">
              {selectedFiles.map((f) => (
                <div key={f.name} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-subtle">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                    <span className="text-[13px] text-on-surface">{f.name}</span>
                  </div>
                  <span className="text-[12px] text-on-surface-variant">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
            <button onClick={uploadFiles} disabled={uploading} className="self-end px-5 py-2.5 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-primary-container shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">upload</span>
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-[13px] text-error flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        {uploadResult && (
          <div className="flex flex-col gap-2">
            <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/30 text-[13px] text-on-surface flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-status-success">check_circle</span>
                <span>
                  {uploadResult.name} profiled successfully —{' '}
                  <span className="font-semibold">{uploadResult.row_count || 0} rows</span> ×{' '}
                  <span className="font-semibold">{uploadResult.column_count || 0} columns</span>
                  {uploadResult.issues > 0 && <span className="text-[12px] text-on-surface-variant"> · {uploadResult.issues} quality flag(s)</span>}
                  {uploadResult.analysis_error && <span className="text-[12px] text-on-surface-variant"> · {uploadResult.analysis_error}</span>}
                </span>
              </div>
              <a href="/profiling" className="text-primary font-semibold hover:underline flex items-center gap-1">
                View profiles <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </a>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-surface-card shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-[16px] text-on-surface">Recent Uploads</h2>
          <button onClick={() => fetchDatasets()} disabled={refreshing} className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
            <span className={`material-symbols-outlined text-[15px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
        {datasets.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-on-surface-variant">No files uploaded yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {datasets.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-subtle">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">description</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-on-surface truncate">{d.name}</span>
                    <span className="text-[11px] text-on-surface-variant">{d.row_count || 0} rows · {d.column_count || 0} cols · health {d.health_score || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[12px] text-on-surface-variant">
                    {(d.file_size || 0) / 1024 / 1024 > 1 ? ((d.file_size || 0) / 1024 / 1024).toFixed(1) + ' MB' : ((d.file_size || 0) / 1024).toFixed(1) + ' KB'}
                  </span>
                  <button onClick={() => deleteDataset(d.id, d.name)} className="flex items-center gap-1 text-[12px] font-semibold text-error/80 hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}