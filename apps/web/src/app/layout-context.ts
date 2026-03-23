import { useOutletContext } from 'react-router-dom'
import type { SpotifyAuthAvailability } from '../lib/auth-flow'

export type AppLayoutContext = {
  isAuthenticated: boolean
  isSessionPending: boolean
  userName: string | null
  spotifyAuthAvailability: SpotifyAuthAvailability
  onSignIn: () => void
}

export function useAppLayoutContext() {
  return useOutletContext<AppLayoutContext>()
}
