import { useEffect, useState } from 'react'

export function useAsyncData(loader, options = {}) {
  const refreshMs = options.refreshMs || 0
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    let intervalId = null

    async function run(showLoading = true) {
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      try {
        const result = await loader()
        if (active) setData(result)
      } catch (caughtError) {
        if (active) setError(caughtError)
      } finally {
        if (active) setLoading(false)
      }
    }

    run()

    if (refreshMs > 0) {
      intervalId = window.setInterval(() => {
        run(false)
      }, refreshMs)
    }

    return () => {
      active = false
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [loader, refreshMs])

  return { data, loading, error, setData }
}
