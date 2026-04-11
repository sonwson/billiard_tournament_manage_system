import { Minus, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/ui/SectionHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchService, tournamentService } from '../services/api'
import { SKILL_LEVEL_OPTIONS } from '../utils/uiConstants'
import { formatMatchTime, formatSkillLevel } from '../utils/formatters'

function getTableSortValue(tableLabel = '') {
  const value = String(tableLabel || '').trim().toUpperCase()

  if (!value || value === 'TABLE TBC') {
    return { group: 3, order: Number.POSITIVE_INFINITY }
  }

  const tvMatch = value.match(/^TV(\d+)$/)
  if (tvMatch) {
    return { group: 1, order: Number(tvMatch[1]) }
  }

  const tableMatch = value.match(/^T(\d+)$/)
  if (tableMatch) {
    return { group: 2, order: Number(tableMatch[1]) }
  }

  return { group: 3, order: Number.POSITIVE_INFINITY }
}

function compareMatchesByTable(left, right) {
  const leftTable = getTableSortValue(left.rawTableNo || left.table)
  const rightTable = getTableSortValue(right.rawTableNo || right.table)

  if (leftTable.group !== rightTable.group) {
    return leftTable.group - rightTable.group
  }

  if (leftTable.order !== rightTable.order) {
    return leftTable.order - rightTable.order
  }

  const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.POSITIVE_INFINITY
  const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.POSITIVE_INFINITY

  if (leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return (left.matchNumber || 0) - (right.matchNumber || 0)
}

function AdminMatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTournamentId = searchParams.get('tournamentId') || ''
  const selectedSkillLevel = searchParams.get('skillLevel') || ''
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [busyMatchId, setBusyMatchId] = useState('')
  const [qrPayloadByTableNo, setQrPayloadByTableNo] = useState({})
  const [scoreDrafts, setScoreDrafts] = useState({})
  const [scheduleDrafts, setScheduleDrafts] = useState({})
  const scoreUpdateLocks = useRef({})

  const tournamentsLoader = useCallback(() => tournamentService.listManageable(), [])
  const { data: tournaments } = useAsyncData(tournamentsLoader)

  const selectedTournament = useMemo(
    () => (tournaments || []).find((tournament) => tournament.id === selectedTournamentId) || null,
    [selectedTournamentId, tournaments],
  )

  const tableOptions = useMemo(() => {
    const totalTables = Number(selectedTournament?.tableCount || 0)
    const tvTables = Math.min(totalTables, Number(selectedTournament?.tvTableCount || 0))
    const options = []

    for (let index = 1; index <= tvTables; index += 1) {
      options.push(`TV${index}`)
    }

    for (let index = tvTables + 1; index <= totalTables; index += 1) {
      options.push(`T${index}`)
    }

    return options
  }, [selectedTournament])

  const matchesLoader = useCallback(async () => {
    if (!selectedTournamentId) {
      return { items: [], meta: null }
    }

    return matchService.listByTournament(selectedTournamentId, {
      skillLevel: selectedSkillLevel || undefined,
      limit: 1000,
    })
  }, [selectedSkillLevel, selectedTournamentId])

  const { data: matchData, loading, error, setData } = useAsyncData(matchesLoader, { refreshMs: 5000 })

  useEffect(() => {
    if (!selectedTournamentId && tournaments?.length) {
      setSearchParams({ tournamentId: tournaments[0].id })
    }
  }, [selectedTournamentId, setSearchParams, tournaments])

  const matches = useMemo(() => matchData?.items || [], [matchData])

  useEffect(() => {
    if (!matches.length) return

    setScoreDrafts((current) => {
      const next = { ...current }
      matches.forEach((match) => {
        if (match.status !== 'finished' && !scoreUpdateLocks.current[match.id]) {
          next[match.id] = {
            player1Score: match.score1 ?? 0,
            player2Score: match.score2 ?? 0,
          }
        }
      })
      return next
    })

    setScheduleDrafts((current) => {
      const next = { ...current }
      matches.forEach((match) => {
        if (current[match.id] && busyMatchId === match.id) {
          next[match.id] = current[match.id]
          return
        }

        const date = match.scheduledAt ? new Date(match.scheduledAt) : null
        const pad = (value) => String(value).padStart(2, '0')
        const scheduledAt = date
          ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
          : ''

        next[match.id] = {
          scheduledAt,
          tableNo: match.rawTableNo || '',
        }
      })
      return next
    })
  }, [busyMatchId, matches])

  const groupedMatches = useMemo(
    () => matches.reduce((acc, match) => {
      const key = `${match.bracketLabel}-${match.round}`
      if (!acc[key]) acc[key] = []
      acc[key].push(match)
      return acc
    }, {}),
    [matches],
  )

  const sortedGroupedMatches = useMemo(
    () =>
      Object.entries(groupedMatches).map(([key, items]) => [
        key,
        items.slice().sort(compareMatchesByTable),
      ]),
    [groupedMatches],
  )

  async function reloadMatches() {
    if (!selectedTournamentId) return

    const refreshed = await matchService.listByTournament(selectedTournamentId, {
      skillLevel: selectedSkillLevel || undefined,
      limit: 1000,
    })

    setData(refreshed)
  }

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams)

    if (key === 'tournamentId') {
      next.delete('skillLevel')
    }

    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  async function adjustScore(match, field, delta) {
    if (busyMatchId === match.id || scoreUpdateLocks.current[match.id]) {
      return
    }

    const draft = scoreDrafts[match.id] || { player1Score: match.score1 ?? 0, player2Score: match.score2 ?? 0 }
    const nextScore = Math.max(0, (draft[field] ?? 0) + delta)
    const nextPayload = {
      player1Score: field === 'player1Score' ? nextScore : draft.player1Score,
      player2Score: field === 'player2Score' ? nextScore : draft.player2Score,
    }

    if (match.status === 'finished') {
      setScoreDrafts((current) => ({
        ...current,
        [match.id]: nextPayload,
      }))
      return
    }

    scoreUpdateLocks.current[match.id] = true
    setBusyMatchId(match.id)
    setActionError('')
    setActionSuccess('')

    try {
      const updatedMatch = await matchService.updateScore(match.id, nextPayload)
      setScoreDrafts((current) => ({
        ...current,
        [match.id]: {
          player1Score: updatedMatch.score1 ?? nextPayload.player1Score,
          player2Score: updatedMatch.score2 ?? nextPayload.player2Score,
        },
      }))
      setData((current) => ({
        ...current,
        items: (current?.items || []).map((item) => (item.id === match.id ? { ...item, ...updatedMatch } : item)),
      }))
      setActionSuccess('Live score updated successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to update live score')
    } finally {
      delete scoreUpdateLocks.current[match.id]
      setBusyMatchId('')
    }
  }

  async function handleSubmit(match) {
    const draft = scoreDrafts[match.id]
    if (!draft) return

    setBusyMatchId(match.id)
    setActionError('')
    setActionSuccess('')

    try {
      await matchService.updateResult(match.id, draft)
      await reloadMatches()
      setActionSuccess(match.status === 'finished' ? 'Score correction saved successfully.' : 'Match finished successfully. The table is ready for the next pairing.')
    } catch (caughtError) {
      setActionError(
        caughtError.message || (match.status === 'finished' ? 'Unable to save score correction' : 'Unable to finish match'),
      )
    } finally {
      setBusyMatchId('')
    }
  }

  function updateScheduleDraft(matchId, key, value) {
    setScheduleDrafts((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [key]: value,
      },
    }))
  }

  async function handleQrGenerate(match) {
    setBusyMatchId(match.id)
    setActionError('')
    setActionSuccess('')

    try {
      const response = await matchService.generateScoreAccess(match.id)
      setQrPayloadByTableNo((current) => ({
        ...current,
        [response.data.tableNo]: response.data,
      }))
      setActionSuccess(`Table QR generated for ${response.data.tableNo}.`)
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to generate QR access')
    } finally {
      setBusyMatchId('')
    }
  }

  async function handleScheduleSave(match) {
    const draft = scheduleDrafts[match.id]
    if (!draft) return

    setBusyMatchId(match.id)
    setActionError('')
    setActionSuccess('')

    try {
      await matchService.schedule(match.id, {
        scheduledAt: draft.scheduledAt
          ? new Date(draft.scheduledAt).toISOString()
          : (match.scheduledAt || new Date().toISOString()),
        tableNo: draft.tableNo || null,
      })
      await reloadMatches()
      setActionSuccess('Match schedule updated successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to update match schedule')
    } finally {
      setBusyMatchId('')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6 lg:p-7">
        <SectionHeader
          eyebrow="Bracket Control"
          title="Manage Match Results"
          description="Review generated brackets by skill level, keep tables moving, and generate QR access by table instead of by individual match."
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Tournament</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
              value={selectedTournamentId}
              onChange={(event) => updateFilter('tournamentId', event.target.value)}
            >
              <option value="">Select tournament</option>
              {(tournaments || []).map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Skill Bracket</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
              value={selectedSkillLevel}
              onChange={(event) => updateFilter('skillLevel', event.target.value)}
            >
              <option value="">All brackets</option>
              {SKILL_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {actionError ? <p className="mt-4 text-sm font-medium text-red-600">{actionError}</p> : null}
        {actionSuccess ? <p className="mt-4 text-sm font-medium text-emerald-600">{actionSuccess}</p> : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6 lg:p-7">
        {loading ? <p className="text-sm text-slate-500">Loading matches...</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

        {!loading && !error && matches.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No generated matches for this tournament yet.
          </div>
        ) : null}

        <div className="space-y-6">
          {sortedGroupedMatches.map(([key, items]) => (
            <section key={key} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#EAB308]">
                    {formatSkillLevel(items[0].skillLevel)}
                  </p>
                  <h3 className="display-title mt-2 text-2xl text-[#0F172A]">{items[0].round}</h3>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
              </div>

              <div className="space-y-4">
                {items.map((match) => {
                  const draft = scoreDrafts[match.id] || { player1Score: 0, player2Score: 0 }
                  const scheduleDraft = scheduleDrafts[match.id] || { scheduledAt: '', tableNo: '' }
                  const isCompleted = match.status === 'finished'
                  const tableQrPayload = match.rawTableNo ? qrPayloadByTableNo[match.rawTableNo] : null
                  const canSubmit = match.player1Id && match.player2Id
                  const hasScoreChanged =
                    draft.player1Score !== (match.score1 ?? 0) || draft.player2Score !== (match.score2 ?? 0)
                  const canSaveCorrection = isCompleted && hasScoreChanged
                  const canFinishMatch =
                    !isCompleted
                    && canSubmit
                    && draft.player1Score !== draft.player2Score
                    && Math.max(draft.player1Score, draft.player2Score) >= (match.raceTo ?? Number.POSITIVE_INFINITY)

                  return (
                    <article
                      key={match.id}
                      className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)] 2xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]"
                    >
                      <div className="grid min-w-0 gap-4">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="text-lg font-bold text-slate-900">{match.bracketLabel}</h4>
                            <StatusBadge tone={match.status}>{match.status}</StatusBadge>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {match.rawTableNo || 'Table TBC'}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-500">{formatMatchTime(match.scheduledAt)}</p>
                          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                            <p>Player 1: {match.player1Name || 'Waiting slot'}</p>
                            <p>Player 2: {match.player2Name || 'Waiting slot'}</p>
                            <p>Race to {match.raceTo}</p>
                            <p>{match.rawTableNo ? `Table ${match.rawTableNo} QR stays with the table.` : 'Assign a table to enable QR.'}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { label: match.player1Name || 'Player 1', field: 'player1Score', value: draft.player1Score },
                            { label: match.player2Name || 'Player 2', field: 'player2Score', value: draft.player2Score },
                          ].map((item) => (
                            <div key={item.field} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                              <p className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                              <div className="mt-5 flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  disabled={!canSubmit || busyMatchId === match.id}
                                  onClick={() => adjustScore(match, item.field, -1)}
                                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <div className="display-title text-5xl text-[#0F172A]">{item.value}</div>
                                <button
                                  type="button"
                                  disabled={!canSubmit || busyMatchId === match.id}
                                  onClick={() => adjustScore(match, item.field, 1)}
                                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid min-w-0 content-start gap-3">
                        <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.85fr)]">
                          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Schedule</p>
                            <div className="mt-3 grid gap-3">
                              <input
                                type="datetime-local"
                                value={scheduleDraft.scheduledAt}
                                onChange={(event) => updateScheduleDraft(match.id, 'scheduledAt', event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#EAB308]"
                              />
                              <select
                                value={scheduleDraft.tableNo}
                                onChange={(event) => updateScheduleDraft(match.id, 'tableNo', event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#EAB308]"
                              >
                                <option value="">Unassigned table</option>
                                {tableOptions.map((tableNo) => (
                                  <option key={tableNo} value={tableNo}>
                                    {tableNo}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={busyMatchId === match.id}
                                onClick={() => handleScheduleSave(match)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                              >
                                Save Schedule
                              </button>
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Table QR</p>
                                <p className="mt-2 text-sm font-semibold text-slate-700">{match.rawTableNo || 'Assign a table first'}</p>
                              </div>
                              {tableQrPayload && !isCompleted ? (
                                <img src={tableQrPayload.qrCodeDataUrl} alt="Table QR" className="h-24 w-24 rounded-xl border border-slate-200" />
                              ) : null}
                            </div>
                            <div className="mt-3 grid gap-3">
                              <button
                                type="button"
                                disabled={busyMatchId === match.id || !match.rawTableNo || isCompleted}
                                onClick={() => handleQrGenerate(match)}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                              >
                                Generate Table QR
                              </button>
                              {tableQrPayload && !isCompleted ? (
                                <a
                                  href={tableQrPayload.scoreUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                                >
                                  Open Table Score Page
                                </a>
                              ) : (
                                <p className="text-xs leading-5 text-slate-500">
                                  The same QR stays bound to this table and continues with the next assigned match.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={busyMatchId === match.id || (isCompleted ? !canSaveCorrection : !canFinishMatch)}
                          onClick={() => handleSubmit(match)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
                        >
                          {busyMatchId === match.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                          {isCompleted ? 'Save Score Correction' : 'Finish Match'}
                        </button>

                        {!isCompleted ? (
                          <p className="text-xs leading-5 text-slate-500">
                            Live score updates happen in real time. When you finish this match, the same table QR will continue on the next assigned pairing with score reset to 0-0.
                          </p>
                        ) : (
                          <p className="text-xs leading-5 text-slate-500">
                            Completed matches can still be corrected using the +/- buttons. If the corrected score changes the winner, the update will be rejected.
                          </p>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminMatchesPage
