import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { navItems } from '../../app/routes'
import { formatTodayLabel } from '../../lib/format'
import type { SpotifyAuthAvailability } from '../../lib/auth-flow'
import { ActionButton } from '../ui/ActionButton'
import { Notice } from '../ui/Notice'
import styles from './AppShell.module.css'

type AppShellProps = {
  children: ReactNode
  isAuthenticated: boolean
  isSessionPending: boolean
  userName: string | null
  spotifyAuthAvailability: SpotifyAuthAvailability
  authFeedback: string | null
  onSignIn: () => void
  onSignOut: () => void
}

export function AppShell({
  children,
  isAuthenticated,
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
              <strong>타임라인과 프로필만 남긴 단순한 기록 앱</strong>
            </div>
          </div>

          <div className={styles.actions}>
            <div className={styles.meta}>
              <span>{formatTodayLabel()}</span>
              <span className={styles.metaChip}>
                {isAuthenticated ? '실제 기록 피드' : '빈 타임라인'}
              </span>
            </div>
            {isSessionPending ? (
              <span className={styles.sessionChip}>세션 확인 중</span>
            ) : userName ? (
              <>
                <span className={styles.sessionChip}>Spotify · {userName}</span>
                <ActionButton onClick={onSignOut} variant="secondary">
                  로그아웃
                </ActionButton>
              </>
            ) : (
              <ActionButton
                disabled={!canStartSpotifySignIn}
                onClick={onSignIn}
                variant="primary"
              >
                {loginButtonLabel}
              </ActionButton>
            )}
          </div>
        </header>

        <nav aria-label="주요 탐색" className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              className={({ isActive }) =>
                [styles.navLink, isActive ? styles['navLink--active'] : '']
                  .filter(Boolean)
                  .join(' ')
              }
              end={item.path === '/'}
              to={item.path}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </NavLink>
          ))}
        </nav>

        {authFeedback ? <Notice tone="error">{authFeedback}</Notice> : null}
        {!userName && spotifyAuthAvailability === 'disabled' ? (
          <Notice tone="subtle">
            서버에 Spotify 로그인 설정이 아직 없습니다. 현재는 빈 타임라인과 프로필 레이아웃만
            확인할 수 있습니다.
          </Notice>
        ) : null}
        {!userName && spotifyAuthAvailability === 'unknown' ? (
          <Notice tone="error">
            로그인 구성을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.
          </Notice>
        ) : null}

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
