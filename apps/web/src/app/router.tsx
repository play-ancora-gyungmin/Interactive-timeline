import { useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { useHealthQuery } from '../hooks/useJournalQueries'
import { authClient } from '../lib/auth-client'
import {
  buildAuthReturnCallbackURL,
  getPostSignInRedirectTarget,
  resolveSpotifyAuthAvailability,
} from '../lib/auth-flow'
import { AuthReturnPage } from '../pages/AuthReturnPage'
import { CreateJournalPage } from '../pages/CreateJournalPage'
import { OverviewPage } from '../pages/OverviewPage'
import { ProfilePage } from '../pages/ProfilePage'
import { internalRoutePaths, routePaths } from './routes'

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    data: session,
    isPending: isSessionPending,
  } = authClient.useSession()
  const healthQuery = useHealthQuery()
  const [authFeedback, setAuthFeedback] = useState<string | null>(null)

  const isAuthenticated = Boolean(session?.user)
  const spotifyAuthAvailability = resolveSpotifyAuthAvailability({
    health: healthQuery.data,
    isPending: healthQuery.isPending,
    hasError: Boolean(healthQuery.error),
  })

  const handleSignIn = () => {
    setAuthFeedback(null)

    if (spotifyAuthAvailability === 'checking') {
      setAuthFeedback('Spotify 로그인 준비 상태를 확인하는 중입니다. 잠시만 기다려 주세요.')
      return
    }

    if (spotifyAuthAvailability === 'disabled') {
      setAuthFeedback('서버에 Spotify 로그인 설정이 아직 없습니다.')
      return
    }

    if (spotifyAuthAvailability === 'unknown') {
      setAuthFeedback('로그인 구성을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }

    const nextPath = getPostSignInRedirectTarget(
      location.pathname,
      location.search,
      location.hash,
    )

    void authClient
      .signIn.social({
        provider: 'spotify',
        callbackURL: buildAuthReturnCallbackURL(nextPath),
        errorCallbackURL: buildAuthReturnCallbackURL(nextPath),
      })
      .then((result) => {
        if (result?.redirect && result.url) {
          window.location.href = result.url
        }
      })
      .catch(() => {
        setAuthFeedback('Spotify 로그인 시작에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      })
  }

  const handleSignOut = () => {
    setAuthFeedback(null)

    void authClient
      .signOut()
      .then(() => {
        navigate(routePaths.overview)
      })
      .catch(() => {
        setAuthFeedback('로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      })
  }

  return (
    <AppShell
      isAuthenticated={isAuthenticated}
      isSessionPending={isSessionPending}
      userName={session?.user?.name ?? null}
      spotifyAuthAvailability={spotifyAuthAvailability}
      authFeedback={authFeedback}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
    >
      <Outlet
        context={{
          isAuthenticated,
          isSessionPending,
          userName: session?.user?.name ?? null,
          spotifyAuthAvailability,
          onSignIn: handleSignIn,
        }}
      />
    </AppShell>
  )
}

function RedirectToOverview() {
  return <Navigate to={routePaths.overview} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={internalRoutePaths.authReturn} element={<AuthReturnPage />} />
        <Route element={<AppLayout />}>
          <Route path={routePaths.overview} element={<OverviewPage />} />
          <Route path={routePaths.create} element={<CreateJournalPage />} />
          <Route path={routePaths.profile} element={<ProfilePage />} />
          <Route path={routePaths.legacyLibrary} element={<Navigate replace to={routePaths.profile} />} />
          <Route path="*" element={<RedirectToOverview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
