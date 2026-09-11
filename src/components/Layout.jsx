import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import DotGrid from './DotGrid'

const navItems = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/upload', label: 'Upload Data', icon: 'cloud_upload' },
  { path: '/datasets', label: 'Datasets', icon: 'folder_copy' },
  { path: '/profiling', label: 'Data Profiling', icon: 'analytics' },
  { path: '/copilot', label: 'DataPilot AI', icon: 'auto_awesome' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
  { path: '/security', label: 'Security', icon: 'shield' },
]

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10">
        <div className="w-9 h-9 rounded-[10px] bg-primary-container flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 20 14" fill="none">
            <path d="M2 12L7 4L12 8L18 1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="18" cy="1" r="2" fill="#60A5FA"/>
          </svg>
        </div>
        <span className="font-display font-extrabold text-[19px] tracking-tight">DataPilot</span>
        <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-secondary-fixed text-on-secondary-fixed">AI</span>
      </div>
      <nav className="flex-1 flex flex-col gap-1 p-3 mt-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                isActive
                  ? 'bg-primary-container text-white shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 m-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">System Online</span>
        </div>
        <span className="text-[12px] text-white/50">DataPilot AI v1.0</span>
      </div>
    </>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const dotBase = theme === 'dark' ? '#B8C4FF' : '#00288E'
  const dotActive = theme === 'dark' ? '#60A5FA' : '#5227FF'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-canvas isolate">
      <DotGrid
        className="dot-grid--background"
        dotSize={4}
        gap={16}
        baseColor={dotBase}
        activeColor={dotActive}
        proximity={110}
        speedTrigger={90}
        shockRadius={200}
        shockStrength={4}
        resistance={700}
        returnDuration={1.4}
      />
      <aside className="hidden lg:flex flex-col w-[260px] bg-sidebar-bg text-white shrink-0 relative z-10">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)}></div>
          <aside className="absolute left-0 top-0 bottom-0 flex flex-col w-[280px] bg-sidebar-bg text-white shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-14 bg-surface-card border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-subtle"
            >
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">menu</span>
            </button>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark / light theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle text-on-surface-variant text-[12px] font-semibold hover:text-primary hover:bg-surface-container-low transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[17px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}