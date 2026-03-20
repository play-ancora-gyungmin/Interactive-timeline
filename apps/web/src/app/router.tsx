import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { sampleEntries } from '../lib/sample-data'
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

  let page = (
    <HomePage entries={sampleEntries.slice(0, 3)} onStartEntry={() => navigate('/today')} />
  )

  if (currentRoute === '/today') {
    page = <TodayEntryPage onBrowseHistory={() => navigate('/history')} />
  }

  if (currentRoute === '/history') {
    page = <HistoryPage entries={sampleEntries} />
  }

  return (
    <AppShell activePath={currentRoute} onNavigate={navigate}>
      {page}
    </AppShell>
  )
}
