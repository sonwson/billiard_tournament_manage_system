import { useCallback, useEffect, useState } from 'react'

export function useAsyncData(loader, options = {}) {
  const refreshMs = options.refreshMs || 0
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const run = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    setError(null)

    try {
      const result = await loader()
      setData(result)
      return result
    } catch (caughtError) {
      setError(caughtError)
      throw caughtError
    } finally {
      setLoading(false)
    }
  }, [loader])

  useEffect(() => {
    let active = true
    let intervalId = null

    const safeRun = async (showLoading = true) => {
      try {
        await run(showLoading)
      } catch {
        if (!active) {
          return
        }
      }
    }

    safeRun()

    if (refreshMs > 0) {
      intervalId = window.setInterval(() => {
        safeRun(false)
      }, refreshMs)
    }

    return () => {
      active = false
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [refreshMs, run])

  return { data, loading, error, setData, reload: run }
}
