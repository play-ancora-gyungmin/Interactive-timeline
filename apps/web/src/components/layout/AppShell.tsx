import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navItems, routePaths } from '../../app/routes'
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

type TabIconProps = {
  className?: string
}

function TimelineTabIcon({ className }: TabIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <rect height="12" rx="2.5" width="4" x="4" y="6" />
      <path d="M11 8h9M11 12h6M11 16h9" strokeLinecap="round" />
    </svg>
  )
}

function ProfileTabIcon({ className }: TabIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M12 12.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
      <path d="M5.75 19.25a6.25 6.25 0 0 1 12.5 0" strokeLinecap="round" />
    </svg>
  )
}

function CreateTabIcon({ className }: TabIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M12 5.5v13M5.5 12h13" strokeLinecap="round" />
    </svg>
  )
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
  const location = useLocation()
  const navigate = useNavigate()
  const canStartSpotifySignIn = spotifyAuthAvailability === 'enabled'
  const loginButtonLabel =
    spotifyAuthAvailability === 'checking' ? 'Spotify 상태 확인 중' : 'Spotify로 로그인'
  const displayName = isSessionPending ? '세션 확인 중' : userName ?? '게스트'
  const isCreateRoute = location.pathname === routePaths.create

  return (
    <div className={styles.shell}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <strong className={styles.appName}>Daily Music Journal</strong>

          <div className={styles.actions}>
            <span className={styles.userName}>{displayName}</span>
            {userName ? (
              <>
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
          <button
            aria-label="저널 작성"
            className={[
              styles.createButton,
              isCreateRoute ? styles['createButton--active'] : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => navigate(routePaths.create)}
            type="button"
          >
            <CreateTabIcon className={styles.createIcon} />
          </button>
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
              <span className={styles.navIconWrap}>
                {item.icon === 'timeline' ? (
                  <TimelineTabIcon className={styles.navIcon} />
                ) : (
                  <ProfileTabIcon className={styles.navIcon} />
                )}
              </span>
              <span className={styles.navLabel}>{item.label}</span>
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
