const fallbackApiBaseUrl = 'http://localhost:4000/api'

const getApiBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (!apiBaseUrl) {
    return fallbackApiBaseUrl
  }

  return apiBaseUrl.replace(/\/$/, '')
}

type HealthResponse = {
  ok: boolean
}

export async function fetchApiHealth(signal?: AbortSignal) {
  const response = await fetch(`${getApiBaseUrl()}/health`, { signal })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  const payload = (await response.json()) as HealthResponse

  return payload.ok === true
}
