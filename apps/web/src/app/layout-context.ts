import { useOutletContext } from 'react-router-dom'

export type AppMode = 'guest' | 'authenticated'

export type AppLayoutContext = {
  appMode: AppMode
  isSessionPending: boolean
  userName: string | null
  onSignIn: () => void
}

export function useAppLayoutContext() {
  return useOutletContext<AppLayoutContext>()
}
