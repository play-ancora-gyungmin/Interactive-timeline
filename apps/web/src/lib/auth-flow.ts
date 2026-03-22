import { internalRoutePaths, routePaths } from '../app/routes'
import type { HealthResponse } from './api'

export type SpotifyAuthAvailability = 'checking' | 'enabled' | 'disabled' | 'unknown'

export const AUTH_RETURN_POLL_INTERVAL_MS = 750
export const AUTH_RETURN_TIMEOUT_MS = 6_000

const fallbackOrigin = 'http://localhost'

const getOrigin = () => (typeof window === 'undefined' ? fallbackOrigin : window.location.origin)

const normalizeSafePath = (path: string) => {
  if (!path || path.startsWith(internalRoutePaths.authReturn)) {
    return routePaths.overview
  }

  return path
}

export function resolveSpotifyAuthAvailability(input: {
  health?: HealthResponse
  isPending: boolean
  hasError: boolean
}): SpotifyAuthAvailability {
  if (input.isPending) {
    return 'checking'
  }

  if (input.hasError || !input.health) {
    return 'unknown'
  }

  return input.health.auth.spotifyEnabled ? 'enabled' : 'disabled'
}

export function sanitizePostAuthRedirect(nextPath: string | null | undefined) {
  const rawValue = typeof nextPath === 'string' ? nextPath.trim() : ''

  if (!rawValue || !rawValue.startsWith('/') || rawValue.startsWith('//')) {
    return routePaths.overview
  }

  const origin = getOrigin()

  try {
    const url = new URL(rawValue, origin)

    if (url.origin !== origin) {
      return routePaths.overview
    }

    return normalizeSafePath(`${url.pathname}${url.search}${url.hash}` || routePaths.overview)
  } catch {
    return routePaths.overview
  }
}

export function getPostSignInRedirectTarget(pathname: string, search: string, hash = '') {
  return sanitizePostAuthRedirect(`${pathname}${search}${hash}`)
}

export function buildAuthReturnCallbackURL(nextPath: string) {
  const url = new URL(internalRoutePaths.authReturn, getOrigin())
  const safeNextPath = sanitizePostAuthRedirect(nextPath)

  if (safeNextPath !== routePaths.overview) {
    url.searchParams.set('next', safeNextPath)
  }

  return url.toString()
}
