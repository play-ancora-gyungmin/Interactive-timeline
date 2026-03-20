import type { ReactNode } from 'react'
import { navItems, type AppRoute } from '../../app/routes'

type AppShellProps = {
  activePath: AppRoute
  children: ReactNode
  onNavigate: (path: AppRoute) => void
}

export function AppShell({ activePath, children, onNavigate }: AppShellProps) {
  const todayLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  return (
    <div className="app-shell">
      <div className="app-shell__inner">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">DM</div>
            <div className="brand-copy">
              <span>Daily Music Journal</span>
              <strong>한 곡으로 남기는 하루</strong>
            </div>
          </div>
          <div className="topbar__meta">{todayLabel}</div>
        </header>

        <nav className="main-nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`nav-chip ${activePath === item.path ? 'nav-chip--active' : ''}`}
              onClick={() => onNavigate(item.path)}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main>{children}</main>
      </div>
    </div>
  )
}
