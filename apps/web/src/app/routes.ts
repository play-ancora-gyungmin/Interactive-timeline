export const routePaths = {
  overview: '/',
  capture: '/capture',
  library: '/library',
} as const

export type AppRoute = (typeof routePaths)[keyof typeof routePaths]

export const navItems: Array<{ path: AppRoute; label: string; description: string }> = [
  { path: routePaths.overview, label: '개요', description: '앱 상태와 최근 기록 확인' },
  { path: routePaths.capture, label: '기록하기', description: '오늘 들은 곡과 메모 작성' },
  { path: routePaths.library, label: '라이브러리', description: '지난 기록 보기, 수정, 삭제' },
]
