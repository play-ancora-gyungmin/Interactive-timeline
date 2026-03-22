import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { authClient } from '../lib/auth-client'
import { HistoryPage } from '../pages/HistoryPage'
import { HomePage } from '../pages/HomePage'
import { TodayEntryPage } from '../pages/TodayEntryPage'
import { type AppRoute } from './routes'

const normalizeRoute = (pathname: string): AppRoute => {
  if (pathname === '/today' || pathname === '/history') {
    return pathname
  }

  return '/'
}

export function AppRouter() {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() =>
    normalizeRoute(window.location.pathname)
  )

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(normalizeRoute(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (nextRoute: AppRoute) => {
    if (window.location.pathname === nextRoute) {
      return
    }

    window.history.pushState({}, '', nextRoute)
    setCurrentRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSignIn = () => {
    void authClient.signIn.social({
      provider: 'spotify',
      callbackURL: window.location.href,
    })
  }

  const handleSignOut = () => {
    void authClient.signOut()
  }

  const isAuthenticated = Boolean(session?.user)
  const pageKey = `${currentRoute}:${session?.user?.id ?? 'guest'}`

  let page = (
    <HomePage
      key={pageKey}
      isAuthenticated={isAuthenticated}
      onStartEntry={() => navigate('/today')}
      onSignIn={handleSignIn}
    />
  )

  if (currentRoute === '/today') {
    page = (
      <TodayEntryPage
        key={pageKey}
        isAuthenticated={isAuthenticated}
        onBrowseHistory={() => navigate('/history')}
        onSignIn={handleSignIn}
      />
    )
  }

  if (currentRoute === '/history') {
    page = (
      <HistoryPage
        key={pageKey}
        isAuthenticated={isAuthenticated}
        onSignIn={handleSignIn}
      />
    )
  }

  return (
    <AppShell
      activePath={currentRoute}
      isSessionPending={isSessionPending}
      userName={session?.user?.name ?? null}
      onNavigate={navigate}
      onSignIn={handleSignIn}
      onSignOut={handleSignOut}
    >
      {page}
    </AppShell>
  )
}
