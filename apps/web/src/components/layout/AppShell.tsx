import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { navItems, routePaths } from '../../app/routes'
import type { AppMode } from '../../app/layout-context'
import { formatTodayLabel } from '../../lib/format'
import type { SpotifyAuthAvailability } from '../../lib/auth-flow'
import { ActionButton } from '../ui/ActionButton'
import { Notice } from '../ui/Notice'
import styles from './AppShell.module.css'

type AppShellProps = {
  children: ReactNode
  appMode: AppMode
  isSessionPending: boolean
  userName: string | null
  spotifyAuthAvailability: SpotifyAuthAvailability
  authFeedback: string | null
  onSignIn: () => void
  onSignOut: () => void
}

export function AppShell({
  children,
  appMode,
  isSessionPending,
  userName,
  spotifyAuthAvailability,
  authFeedback,
  onSignIn,
  onSignOut,
}: AppShellProps) {
  const canStartSpotifySignIn = spotifyAuthAvailability === 'enabled'
  const loginButtonLabel =
    spotifyAuthAvailability === 'checking' ? 'Spotify 상태 확인 중' : 'Spotify로 로그인'

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
              <ActionButton
                disabled={!canStartSpotifySignIn}
                variant="primary"
                onClick={onSignIn}
              >
                {loginButtonLabel}
              </ActionButton>
            )}
          </div>
        </header>

        {authFeedback ? <Notice tone="error">{authFeedback}</Notice> : null}
        {!userName && spotifyAuthAvailability === 'disabled' ? (
          <Notice tone="subtle">
            서버에 Spotify 로그인 설정이 아직 없습니다. 지금은 게스트 모드로 홈과 라이브러리만
            확인할 수 있습니다.
          </Notice>
        ) : null}
        {!userName && spotifyAuthAvailability === 'unknown' ? (
          <Notice tone="error">
            로그인 구성을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </Notice>
        ) : null}

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
