import { useState } from 'react'

const LAYERS = [
  {
    id: 'network',
    title: 'Network & Server Configurations',
    icon: 'dns',
    accent: 'text-secondary',
    desc: 'Hardening the edge of your stack — transport encryption, perimeter filtering, and server hardening.',
    items: [
      { icon: 'https', title: 'HTTPS (SSL/TLS Encryption)', desc: 'Encrypts all traffic between the user and server. Enforce HTTP to HTTPS redirects and configure HSTS (Strict-Transport-Security).', tags: ['HSTS', 'TLS 1.2+'] },
      { icon: 'security', title: 'Web Application Firewall (WAF)', desc: 'Filters malicious traffic, SQL injection attempts, and bot attacks before they reach your server (e.g., Cloudflare, AWS WAF).', tags: ['Cloudflare', 'AWS WAF'] },
      { icon: 'block', title: 'DDoS Protection', desc: 'Mitigates volumetric and application-layer attacks via rate limiting, IP reputation filtering, and CDN integration.', tags: ['Rate limiting', 'CDN'] },
      { icon: 'folder_off', title: 'Directory Browsing Disabled', desc: 'Prevents visitors from viewing raw server file indexes if an index.html file is missing.', tags: ['Index autoindex off'] },
      { icon: 'lock', title: 'File Permissions', desc: 'Restrict directory permissions tightly (e.g., 755 for directories, 644 for files on Linux systems) to block execution scripts.', tags: ['755 dirs', '644 files'] },
      { icon: 'travel_explore', title: 'DNSSEC & Hidden Origin IP', desc: 'Protects domain resolution from spoofing/cache poisoning and routes traffic through proxies to mask original server IPs.', tags: ['DNSSEC', 'Reverse proxy'] },
    ],
  },
  {
    id: 'headers',
    title: 'HTTP Security Headers',
    icon: 'code',
    accent: 'text-primary',
    desc: 'Response headers configured directly in your web server (Nginx, Apache, or Cloudflare) that instruct browsers to lock down.',
    items: [
      { icon: 'policy', title: 'Content Security Policy (CSP)', desc: 'Restricts sources from which scripts, images, and styles can load to mitigate Cross-Site Scripting (XSS).', code: "Content-Security-Policy: default-src 'self'" },
      { icon: 'crop_free', title: 'X-Frame-Options', desc: 'Prevents Clickjacking by disallowing your site to be embedded in <iframe> tags (or via CSP frame-ancestors).', code: 'X-Frame-Options: DENY' },
      { icon: 'description', title: 'X-Content-Type-Options: nosniff', desc: 'Stops browsers from MIME-sniffing response types, reducing script execution risks.', code: 'X-Content-Type-Options: nosniff' },
      { icon: 'link', title: 'Referrer-Policy', desc: 'Controls how much referrer information is sent when users click links away from your site.', code: 'Referrer-Policy: strict-origin-when-cross-origin' },
      { icon: 'privacy_tip', title: 'Permissions-Policy', desc: 'Restricts browser features (camera, microphone, geolocation) for users on your domain.', code: 'Permissions-Policy: camera=(), microphone=(), geolocation=()' },
    ],
  },
  {
    id: 'application',
    title: 'Application & Code Security',
    icon: 'terminal',
    accent: 'text-tertiary',
    desc: 'Defense-in-depth inside your application code and data layer.',
    items: [
      { icon: 'sanitizer', title: 'Input Sanitization & Parameterized Queries', desc: 'Prevent SQL Injection (SQLi) and XSS by escaping user inputs and using prepared statements for database transactions.', tags: ['Prepared statements', 'SQLi', 'XSS'] },
      { icon: 'cookie', title: 'Secure Cookie Attributes', desc: 'Enforce HttpOnly (blocks JavaScript access), Secure (requires HTTPS), and SameSite=Strict or Lax (prevents Cross-Site Request Forgery / CSRF).', tags: ['HttpOnly', 'Secure', 'SameSite'] },
      { icon: 'verified_user', title: 'Cross-Site Request Forgery (CSRF) Tokens', desc: 'Use unique anti-CSRF tokens for form submissions and state-changing POST/PUT requests.', tags: ['POST', 'PUT'] },
      { icon: 'upload_file', title: 'Strict File Upload Restrictions', desc: 'Validate uploaded files by extension and MIME type. Store uploaded files outside the public web root directory and disable script execution in upload folders.', tags: ['MIME scan', 'Off-root storage'] },
    ],
  },
  {
    id: 'access',
    title: 'Authentication & Access Control',
    icon: 'fingerprint',
    accent: 'text-status-success',
    desc: 'Who gets in, how far they go, and how sessions are managed.',
    items: [
      { icon: 'lock_person', title: 'Multi-Factor Authentication (MFA/2FA)', desc: 'Mandatory for all admin panels and privileged user accounts.', tags: ['Admins', 'Privileged'] },
      { icon: 'timer', title: 'Rate Limiting & Brute Force Defense', desc: 'Limit login attempts (e.g., lock accounts or trigger CAPTCHAs after 5 failed tries).', tags: ['Lockout', 'CAPTCHA'] },
      { icon: 'admin_panel_settings', title: 'Role-Based Access Control (RBAC)', desc: 'Assign the Principle of Least Privilege — give team members only the permissions needed for their role.', tags: ['Least privilege'] },
      { icon: 'signpost', title: 'Change Default Paths', desc: 'Change default administration paths (e.g., custom login URL instead of standard /wp-admin or /admin).', tags: ['Custom login URL'] },
      { icon: 'schedule', title: 'Session Management', desc: 'Set short session timeout thresholds and invalidate old sessions immediately upon logout or password updates.', tags: ['Timeouts', 'Invalidate on logout'] },
    ],
  },
  {
    id: 'operations',
    title: 'Operations, Updates & Monitoring',
    icon: 'monitoring',
    accent: 'text-status-warning',
    desc: 'Keeping the platform patched, recoverable, and watched around the clock.',
    items: [
      { icon: 'system_update', title: 'Automated Patch Management', desc: 'Keep the base server OS, CMS framework (WordPress, Laravel, Node.js), themes, and plugins updated immediately upon release.', tags: ['OS', 'Frameworks', 'Plugins'] },
      { icon: 'backup', title: 'Offsite Automated Backups', desc: 'Schedule regular full-site and database backups stored isolated off-site for rapid disaster recovery.', tags: ['Off-site', 'Automated'] },
      { icon: 'bug_report', title: 'Malware & Integrity Scanners', desc: 'Run daily automated file-change checks and vulnerability scans to catch compromised files early.', tags: ['Daily scans', 'Integrity'] },
      { icon: 'timeline', title: 'Centralized Logging & Alerting', desc: 'Track server error logs, access logs, and failed login events with real-time alerts for anomalies.', tags: ['Real-time alerts', 'Anomaly detection'] },
    ],
  },
]

function Badge({ children, tone = 'secondary' }) {
  const tones = {
    secondary: 'bg-secondary-fixed-dim/25 text-secondary font-bold',
    primary: 'bg-primary-fixed/50 text-primary font-bold',
    tertiary: 'bg-tertiary-fixed/50 text-tertiary font-bold',
    success: 'bg-status-success/15 text-status-success font-bold',
    warning: 'bg-status-warning/15 text-status-warning font-bold',
  }
  return <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}

function FeatureCard({ item, tone }) {
  return (
    <div className="bg-surface-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 border border-transparent hover:border-border-subtle/60">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center">
          <span className={`material-symbols-outlined text-[21px] ${tones[tone].icon}`}>{item.icon}</span>
        </div>
        <Badge tone={tone}>Protected</Badge>
      </div>
      <div className="flex flex-col gap-1.5 flex-1">
        <h4 className="text-[15px] font-display font-bold text-on-surface leading-snug">{item.title}</h4>
        <p className="text-[13px] font-body text-on-surface-variant leading-relaxed">{item.desc}</p>
      </div>
      {item.code && (
        <pre className="text-[11px] font-mono text-on-surface bg-surface-subtle rounded-lg px-3 py-2.5 overflow-x-auto whitespace-pre-wrap break-all">{item.code}</pre>
      )}
      {item.tags && (
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-md bg-surface-container text-primary text-[10px] font-bold uppercase tracking-wider">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

const tones = {
  secondary: { icon: 'text-secondary' },
  primary: { icon: 'text-primary' },
  tertiary: { icon: 'text-tertiary' },
  success: { icon: 'text-status-success' },
  warning: { icon: 'text-status-warning' },
}

export default function Security() {
  const [activeLayer, setActiveLayer] = useState(LAYERS[0].id)
  const totalControls = LAYERS.reduce((n, l) => n + l.items.length, 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-low via-surface-card to-surface-card p-6 lg:p-8 shadow-sm">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-status-success opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card shadow-sm mb-4">
              <span className="flex h-2 w-2 rounded-full bg-status-success animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase text-secondary tracking-wider">Security Center</span>
            </div>
            <h1 className="font-display font-bold text-[28px] lg:text-[32px] text-on-surface tracking-tight">
              5 Layers of Defense
            </h1>
            <p className="text-[14px] font-body text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
              Hardening stack from the network edge to production operations — {totalControls} enforced security controls across {LAYERS.length} layers.
            </p>
          </div>
          <div className="flex items-center gap-8 shrink-0">
            <div className="text-center">
              <div className="font-mono text-[30px] font-bold text-status-success">100</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Security Score</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-[30px] font-bold text-primary">{totalControls}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Controls</div>
            </div>
          </div>
        </div>
      </div>

      {/* Layer tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-1">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 ${
              activeLayer === l.id ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-card hover:bg-surface-subtle text-on-surface-variant shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{l.icon}</span>
            {l.title}
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${activeLayer === l.id ? 'bg-white/25' : 'bg-surface-container text-primary'}`}>{l.items.length}</span>
          </button>
        ))}
      </nav>

      {/* Active layer detail */}
      {LAYERS.map((layer) => {
        if (layer.id !== activeLayer) return null
        return (
          <div key={layer.id} className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                <span className={`material-symbols-outlined text-[24px] ${layer.accent}`}>{layer.icon}</span>
              </div>
              <div>
                <h2 className="text-[20px] font-display font-bold text-on-surface tracking-tight">{layer.title}</h2>
                <p className="text-[13px] text-on-surface-variant mt-0.5">{layer.desc}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {layer.items.map((item) => (
                <FeatureCard key={item.title} item={item} tone={layer.accent.replace('text-', '')} />
              ))}
            </div>
          </div>
        )
      })}

      {/* All layers overview */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[20px] font-display font-bold text-on-surface tracking-tight">Full Control Inventory</h2>
          <p className="text-[13px] text-on-surface-variant">Every security control active across the platform.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {LAYERS.flatMap((l) =>
            l.items.map((item) => (
              <div key={item.title} className="flex items-center gap-3 p-3 rounded-xl bg-surface-card shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center shrink-0">
                  <span className={`material-symbols-outlined text-[19px] ${tones[l.accent.replace('text-', '')].icon}`}>{item.icon}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-on-surface truncate">{item.title}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-status-warning">{l.icon}</span>
                    <span className="text-[11px] text-on-surface-variant">{l.title}</span>
                  </div>
                </div>
                <span className="ml-auto w-2 h-2 rounded-full bg-status-success shrink-0"></span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}