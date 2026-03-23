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

function BrandMarkIcon({ className }: TabIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 84 40"
    >
      <defs>
        <linearGradient
          id="app-shell-brand-gradient"
          x1="8"
          x2="76"
          y1="6"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-coral)" />
          <stop offset="1" stopColor="var(--accent-teal)" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="82"
        height="38"
        rx="15"
        fill="url(#app-shell-brand-gradient)"
      />
      <rect
        x="1"
        y="1"
        width="82"
        height="38"
        rx="15"
        stroke="white"
        strokeOpacity="0.28"
      />
      <circle
        cx="24"
        cy="20"
        r="10"
        fill="white"
        fillOpacity="0.16"
        stroke="white"
        strokeOpacity="0.56"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="20" r="2.8" fill="white" fillOpacity="0.94" />
      <path
        d="M19 15.5a7 7 0 0 1 7-2.3"
        stroke="white"
        strokeLinecap="round"
        strokeOpacity="0.72"
        strokeWidth="1.5"
      />
      <rect
        x="42"
        y="10"
        width="28"
        height="20"
        rx="7"
        fill="white"
        fillOpacity="0.16"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />
      <path
        d="M50.5 15.5h11M50.5 20h8M50.5 24.5h11"
        stroke="white"
        strokeLinecap="round"
        strokeOpacity="0.9"
        strokeWidth="1.8"
      />
      <path
        d="M46.5 14.5v11"
        stroke="white"
        strokeLinecap="round"
        strokeOpacity="0.5"
        strokeWidth="1.5"
      />
      <circle cx="46.5" cy="17" r="1.1" fill="white" fillOpacity="0.88" />
      <circle cx="46.5" cy="23" r="1.1" fill="white" fillOpacity="0.88" />
    </svg>
  )
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
          <strong className={styles.appName}>
            <BrandMarkIcon className={styles.appNameIcon} />
            <span className={styles.srOnly}>Daily Music Journal</span>
          </strong>

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
