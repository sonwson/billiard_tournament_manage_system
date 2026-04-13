import { useAppStore } from '../store/appStore'
import { authService } from '../services/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

export class ApiClientError extends Error {
  constructor(message, status, payload = null) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.payload = payload
  }
}

// Track if a refresh is already in progress to avoid multiple simultaneous refresh calls
let isRefreshing = false
// Queue of requests waiting for the token refresh to complete
let refreshSubscribers = []

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((callback) => callback(newAccessToken))
  refreshSubscribers = []
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback)
}

export async function apiRequest(path, options = {}) {
  const result = await makeRequest(path, options)
  return result
}

async function makeRequest(path, options, retryCount = 0) {
  const { auth, mergeAuth } = useAppStore.getState()
  let { accessToken } = auth

  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    // If 401 and we haven't retried yet, try to refresh the token
    if (response.status === 401 && retryCount === 0 && auth.refreshToken) {
      try {
        const newAccessToken = await handleTokenRefresh(auth.refreshToken, mergeAuth)
        // Update the token and retry the original request
        mergeAuth({ accessToken: newAccessToken })
        return makeRequest(path, options, retryCount + 1)
      } catch {
        // Token refresh failed, throw the original 401 error
        throw new ApiClientError(
          payload?.error?.message || `Request failed with status ${response.status}`,
          response.status,
          payload,
        )
      }
    }

    throw new ApiClientError(
      payload?.error?.message || `Request failed with status ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload
}

async function handleTokenRefresh(refreshToken, mergeAuth) {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing) {
    return new Promise((resolve) => {
      addRefreshSubscriber((newToken) => {
        // Update the store with the new token once refresh completes
        resolve(newToken)
      })
    })
  }

  isRefreshing = true

  try {
    const response = await authService.refresh(refreshToken)
    const { accessToken, refreshToken: newRefreshToken } = response.data

    // Update the store with new tokens
    mergeAuth({ accessToken, refreshToken: newRefreshToken })

    // Notify all waiting requests that the token has been refreshed
    onRefreshed(accessToken)

    return accessToken
  } finally {
    isRefreshing = false
  }
}
