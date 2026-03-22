import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { navItems, routePaths } from '../../app/routes'
import type { AppMode } from '../../app/layout-context'
import { formatTodayLabel } from '../../lib/format'
import { ActionButton } from '../ui/ActionButton'
import { Notice } from '../ui/Notice'
import styles from './AppShell.module.css'

type AppShellProps = {
  children: ReactNode
  appMode: AppMode
  isSessionPending: boolean
  userName: string | null
  authFeedback: string | null
  onSignIn: () => void
  onSignOut: () => void
}

export function AppShell({
  children,
  appMode,
  isSessionPending,
  userName,
  authFeedback,
  onSignIn,
  onSignOut,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.mark}>DM</div>
            <div className={styles.copy}>
              <span className={styles.eyebrow}>Daily Music Journal</span>
              <strong>곡과 메모로 남기는 오늘의 기록</strong>
            </div>
          </div>

          <div className={styles.actions}>
            <div className={styles.meta}>
              <span>{formatTodayLabel()}</span>
              <span className={styles.modeChip}>
                {appMode === 'authenticated' ? '실사용 모드' : '게스트 모드'}
              </span>
            </div>
            {isSessionPending ? (
              <span className={styles.sessionChip}>세션 확인 중</span>
            ) : userName ? (
              <>
                <span className={styles.sessionChip}>Spotify · {userName}</span>
                <ActionButton variant="secondary" onClick={onSignOut}>
                  로그아웃
                </ActionButton>
              </>
            ) : (
              <ActionButton variant="primary" onClick={onSignIn}>
                Spotify로 로그인
              </ActionButton>
            )}
          </div>
        </header>

        {authFeedback ? <Notice tone="error">{authFeedback}</Notice> : null}

        <nav aria-label="주요 탐색" className={styles.desktopNav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              className={({ isActive }) =>
                [styles.navLink, isActive ? styles['navLink--active'] : '']
                  .filter(Boolean)
                  .join(' ')
              }
              end={item.path === routePaths.overview}
              to={item.path}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </NavLink>
          ))}
        </nav>

        <main className={styles.main}>{children}</main>
      </div>

      <nav aria-label="모바일 주요 탐색" className={styles.mobileNav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            className={({ isActive }) =>
              [styles.mobileNavLink, isActive ? styles['mobileNavLink--active'] : '']
                .filter(Boolean)
                .join(' ')
            }
            end={item.path === routePaths.overview}
            to={item.path}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
