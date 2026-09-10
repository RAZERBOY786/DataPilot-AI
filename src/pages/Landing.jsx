import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOverview } from '../api/stats'

function calculateROI(teamSize, datasets) {
  const hoursSaved = Math.round(teamSize * (datasets * 0.9) + teamSize * 4)
  const costSaved = hoursSaved * 90
  const softwareCost = teamSize * 149
  const roiMultiplier = softwareCost > 0 ? (costSaved / softwareCost).toFixed(1) : '10.0'
  return {
    teamSizeLabel: teamSize + (teamSize === 1 ? ' Person' : ' People'),
    datasetsLabel: datasets + ' Datasets',
    hoursSavedLabel: hoursSaved.toLocaleString() + ' hrs',
    costSavedLabel: '$' + costSaved.toLocaleString(),
    roiMultiplierLabel: roiMultiplier + 'x',
  }
}

export default function Landing() {
  const [teamSize, setTeamSize] = useState(1)
  const [datasets, setDatasets] = useState(5)
  const [stats, setStats] = useState(null)
  const [backendOk, setBackendOk] = useState(true)
  const roi = calculateROI(teamSize, datasets)
  const navigate = useNavigate()

  useEffect(() => {
    getOverview()
      .then((s) => { setStats(s); setBackendOk(true) })
      .catch(() => { setStats(null); setBackendOk(false) })
  }, [])

  const modules = [
    { icon: 'database', title: 'Smart Ingestion & Schema Detection', desc: 'Multi-protocol ingest with auto schema parsing and type inference.', features: ['Sub-second schema detection', 'Auto-detects timestamps & geo keys', 'CSV, XLSX, JSON, Parquet support'] },
    { icon: 'analytics', title: 'AI Profiler & Data Quality', desc: 'Statistical distribution analysis, missingness patterns, and anomaly detection.', features: ['Missing value correlation', 'Skewness & kurtosis scoring', 'Type topology analysis'] },
    { icon: 'auto_fix_high', title: 'CleanBot Studio', desc: 'Production-ready data cleaning with imputation and outlier handling.', features: ['IQR & Tukey outlier trimming', 'Fuzzy string normalization', 'Reversible recipe generation'] },
    { icon: 'insights', title: 'Predictive EDA & Insights', desc: 'Surface high-impact drivers and generate executive-ready summaries.', features: ['Feature importance ranking', 'Executive narrative summaries', 'Segment clustering'] },
    { icon: 'auto_awesome', title: 'DataPilot AI', desc: 'Ask questions in plain English. Get SQL, charts, and analysis.', features: ['Natural language to SQL', 'Interactive data exploration', 'Code generation & explanation'], wide: true },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-surface-container-low via-surface-card to-surface-card p-6 lg:p-10 mb-8 shadow-sm">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary-fixed opacity-30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card shadow-sm mb-4">
            <span className="flex h-2 w-2 rounded-full bg-status-success animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase text-secondary tracking-wider">DataPilot AI</span>
          </div>
          <h1 className="text-[36px] lg:text-[42px] font-display font-bold text-on-surface tracking-tight leading-tight">
            Autonomous Data Analytics & Quality Studio
          </h1>
          <p className="text-[16px] font-body text-on-surface-variant mt-4 max-w-xl leading-relaxed">
            Turn raw tabular data into insights, cleaned datasets, and production SQL — all from a single platform.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-on-primary text-[15px] font-display font-semibold hover:bg-primary-container transition-all shadow-[0_4px_16px_rgba(30,64,175,0.25)]"
            >
              <span className="material-symbols-outlined text-[20px]">bolt</span>
              Start Free Analysis
            </button>
            <button
              onClick={() => navigate('/datasets')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-card text-on-surface text-[15px] font-display font-semibold shadow-sm hover:bg-surface-subtle transition-all"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">folder_copy</span>
              View Datasets
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t border-border-subtle/40 w-full max-w-md">
            <div>
              <div className="text-[24px] font-mono font-semibold text-on-surface-variant">{stats ? stats.datasets.toLocaleString() : '--'}</div>
              <div className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Datasets</div>
            </div>
            <div>
              <div className="text-[24px] font-mono font-semibold text-on-surface-variant">{stats ? stats.rows.toLocaleString() : '--'}</div>
              <div className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Rows Profiled</div>
            </div>
            <div>
              <div className="text-[24px] font-mono font-semibold text-on-surface-variant">{stats ? stats.columns.toLocaleString() : '--'}</div>
              <div className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">Columns</div>
            </div>
          </div>
        </div>
      </section>

      {!backendOk && (
        <div className="mb-6 p-4 rounded-xl border border-error/30 bg-error/5 flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px] text-error">cloud_off</span>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-on-surface">Backend not reachable</span>
            <span className="text-[12px] text-on-surface-variant">Start it with: python -m uvicorn app.main:app --port 8000</span>
          </div>
        </div>
      )}

      {/* Modules */}
      <section className="mb-8">
        <div className="flex flex-col mb-6">
          <h2 className="text-[26px] font-display font-bold text-on-surface tracking-tight">Core Modules</h2>
          <p className="text-[14px] font-body text-on-surface-variant max-w-2xl mt-1">
            End-to-end pipeline from ingestion to insights.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <div
              key={m.title}
              className={`bg-surface-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ${m.wide ? 'md:col-span-2' : ''}`}
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-primary mb-4">
                  <span className="material-symbols-outlined text-[24px]">{m.icon}</span>
                </div>
                <h3 className="text-[16px] font-display font-bold text-on-surface">{m.title}</h3>
                <p className="text-[13px] font-body text-on-surface-variant mt-1.5 leading-relaxed">{m.desc}</p>
                <div className="mt-3 space-y-1.5">
                  {m.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-[13px] font-body text-on-surface">
                      <span className="material-symbols-outlined text-status-success text-[16px]">check_circle</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="bg-surface-card rounded-2xl p-6 lg:p-8 mb-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col">
            <h2 className="text-[22px] font-display font-bold text-on-surface">Calculate Your ROI</h2>
            <p className="text-[14px] font-body text-on-surface-variant mt-1 mb-6">
              Estimate monthly hours saved and cost reduction.
            </p>
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[14px] font-display font-semibold text-on-surface">Team Size</label>
                <span className="text-[16px] font-mono font-bold text-primary">{roi.teamSizeLabel}</span>
              </div>
              <input className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary" type="range" min="1" max="50" value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[14px] font-display font-semibold text-on-surface">Monthly Datasets</label>
                <span className="text-[16px] font-mono font-bold text-primary">{roi.datasetsLabel}</span>
              </div>
              <input className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary" type="range" min="5" max="200" value={datasets} onChange={(e) => setDatasets(Number(e.target.value))} />
            </div>
          </div>
          <div className="bg-gradient-to-tr from-surface-container-low via-surface-card to-surface-container-low rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-3 mb-3">
              <span className="text-[14px] font-display font-semibold text-on-surface">Projected Monthly Savings</span>
              <span className="px-2 py-0.5 rounded bg-status-success/20 text-[11px] font-semibold">Estimate</span>
            </div>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <div className="text-[11px] font-medium uppercase text-on-surface-variant tracking-wider">Hours Saved</div>
                <div className="font-mono text-[28px] font-bold text-primary mt-1">{roi.hoursSavedLabel}</div>
              </div>
              <div>
                <div className="text-[11px] font-medium uppercase text-on-surface-variant tracking-wider">Cost Benefit</div>
                <div className="font-mono text-[28px] font-bold text-secondary mt-1">{roi.costSavedLabel}</div>
              </div>
            </div>
            <div className="bg-surface-card p-3 rounded-xl mt-3 text-center">
              <span className="text-[14px] font-display font-semibold text-on-surface">ROI: </span>
              <span className="text-[18px] font-mono font-bold text-status-success">{roi.roiMultiplierLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sidebar-bg rounded-2xl p-8 text-on-secondary relative overflow-hidden shadow-xl mb-8">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-secondary opacity-30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col text-left max-w-xl">
            <h2 className="text-[26px] font-display font-bold text-on-secondary tracking-tight">
              Ready to get started?
            </h2>
            <p className="text-[14px] font-body text-surface-container-highest mt-2">
              Upload your first dataset and see insights in minutes.
            </p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-3 rounded-xl bg-primary-container text-on-primary text-[15px] font-display font-semibold hover:bg-primary transition-all shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
          >
            Launch Workspace
          </button>
        </div>
      </section>
    </>
  )
}
