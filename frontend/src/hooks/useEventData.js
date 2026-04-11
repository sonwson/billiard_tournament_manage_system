import { useCallback, useMemo } from 'react'
import { tournamentService } from '../services/api'
import { useAsyncData } from './useAsyncData'

export function useEventData(eventId) {
  const loader = useCallback(() => tournamentService.getById(eventId), [eventId])
  const { data, loading, error } = useAsyncData(loader, { refreshMs: 5000 })

  return useMemo(
    () => ({
      event: data?.event || null,
      eventMatches: data?.upcomingMatches || [],
      eventPlayers: data?.approvedPlayers || [],
      loading,
      error,
    }),
    [data, error, loading],
  )
}
