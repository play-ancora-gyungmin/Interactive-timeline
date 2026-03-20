export type AppRoute = '/' | '/today' | '/history'

export const navItems: Array<{ path: AppRoute; label: string; description: string }> =
  [
    { path: '/', label: 'Home', description: '최근 기록과 상태 확인' },
    { path: '/today', label: 'Today', description: '오늘의 음악 일기 작성' },
    { path: '/history', label: 'History', description: '지난 기록 다시 보기' },
  ]
