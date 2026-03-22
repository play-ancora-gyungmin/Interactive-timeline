import { useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { authClient } from '../lib/auth-client'
import { CapturePage } from '../pages/CapturePage'
import { LibraryPage } from '../pages/LibraryPage'
import { OverviewPage } from '../pages/OverviewPage'
import type { AppMode } from './layout-context'
import { routePaths } from './routes'

function AppLayout() {
  const navigate = useNavigate()
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [authFeedback, setAuthFeedback] = useState<string | null>(null)

  const appMode: AppMode = session?.user ? 'authenticated' : 'guest'

  const handleSignIn = () => {
    setAuthFeedback(null)

    void authClient
      .signIn.social({
        provider: 'spotify',
        callbackURL: window.location.href,
      })
      .catch(() => {
        setAuthFeedback('Spotify 로그인 구성을 확인한 뒤 다시 시도해 주세요.')
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
      appMode={appMode}
      isSessionPending={isSessionPending}
      userName={session?.user?.name ?? null}
      authFeedback={authFeedback}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
    >
      <Outlet
        context={{
          appMode,
          isSessionPending,
          userName: session?.user?.name ?? null,
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
        <Route element={<AppLayout />}>
          <Route path={routePaths.overview} element={<OverviewPage />} />
          <Route path={routePaths.capture} element={<CapturePage />} />
          <Route path={routePaths.library} element={<LibraryPage />} />
          <Route path="*" element={<RedirectToOverview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
