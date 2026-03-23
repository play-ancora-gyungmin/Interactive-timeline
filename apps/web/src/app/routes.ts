export const routePaths = {
  overview: '/',
  profile: '/profile',
  create: '/journals/new',
  legacyLibrary: '/library',
} as const

export const internalRoutePaths = {
  authReturn: '/auth/return',
} as const

export type AppRoute = typeof routePaths.overview | typeof routePaths.profile
export type AppTabIcon = 'timeline' | 'profile'

export const navItems: Array<{ path: AppRoute; label: string; icon: AppTabIcon }> = [
  { path: routePaths.overview, label: '타임라인', icon: 'timeline' },
  { path: routePaths.profile, label: '프로필', icon: 'profile' },
]
