import { createAuthClient } from 'better-auth/react'

const fallbackApiBasePath = '/api'

const isAbsoluteUrl = (value: string) => /^https?:\/\//.test(value)

const normalizePath = (value: string) => {
  const trimmed = value.trim()

  if (!trimmed) {
    return fallbackApiBasePath
  }

  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`

  return prefixed.replace(/\/$/, '')
}

const getAuthClientOptions = () => {
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL?.trim()

  if (!apiBaseURL) {
    return {
      basePath: `${fallbackApiBasePath}/auth`,
    }
  }

  if (isAbsoluteUrl(apiBaseURL)) {
    return {
      baseURL: apiBaseURL.replace(/\/api\/?$/, ''),
    }
  }

  return {
    basePath: `${normalizePath(apiBaseURL)}/auth`,
  }
}

export const authClient = createAuthClient(getAuthClientOptions())
