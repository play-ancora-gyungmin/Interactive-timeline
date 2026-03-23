export const routePaths = {
  overview: '/',
  profile: '/profile',
  legacyLibrary: '/library',
} as const

export const internalRoutePaths = {
  authReturn: '/auth/return',
} as const

export type AppRoute = typeof routePaths.overview | typeof routePaths.profile

export const navItems: Array<{ path: AppRoute; label: string; description: string }> = [
  { path: routePaths.overview, label: '타임라인', description: '실제 기록 피드 보기' },
  { path: routePaths.profile, label: '프로필', description: '내 정보와 최근 기록 확인' },
]
