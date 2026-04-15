import { Minus, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/ui/SectionHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchService, tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { formatMatchTime } from '../utils/formatters'
import { t } from '../utils/i18n'

function formatScheduledPlayerName(playerName, skillLevel, locale) {
  if (!playerName || playerName === 'TBD' || playerName === 'Waiting Slot') {
    return playerName
  }

  return skillLevel ? `${playerName} - ${t(locale, `skillLevels.${skillLevel}`)}` : playerName
}

function shouldShowBracketLabel(bracketLabel, skillLevel) {
  if (!bracketLabel) return false

  const normalizedLabel = String(bracketLabel).trim().toUpperCase()
  const normalizedSkill = String(skillLevel || '').trim().toUpperCase()

  if (!normalizedLabel) return false
  if (normalizedSkill && normalizedLabel === normalizedSkill) return false
  if (['CN', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K'].includes(normalizedLabel)) return false

  return true
}

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
  const locale = useAppStore((state) => state.locale)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTournamentId = searchParams.get('tournamentId') || ''
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
      limit: 1000,
    })
  }, [selectedTournamentId])

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
      limit: 1000,
    })

    setData(refreshed)
  }

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams)

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
      setActionSuccess(t(locale, 'adminMatches.liveScoreUpdated'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminMatches.liveScoreFailed'))
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
      setActionSuccess(match.status === 'finished' ? t(locale, 'adminMatches.scoreCorrectionSaved') : t(locale, 'adminMatches.matchFinished'))
    } catch (caughtError) {
      setActionError(
        caughtError.message || (match.status === 'finished' ? t(locale, 'adminMatches.correctionFailed') : t(locale, 'adminMatches.finishFailed')),
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
      setActionSuccess(t(locale, 'adminMatches.qrGenerated', { tableNo: response.data.tableNo }))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminMatches.qrFailed'))
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
      setActionSuccess(t(locale, 'adminMatches.scheduleUpdated'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminMatches.scheduleFailed'))
    } finally {
      setBusyMatchId('')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6 lg:p-7">
        <SectionHeader
          eyebrow={t(locale, 'adminMatches.eyebrow')}
          title={t(locale, 'adminMatches.title')}
          description={t(locale, 'adminMatches.description')}
        />

        <div className="mt-6 grid gap-4">
          <label className="block min-w-0">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminMatches.tournament')}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
              value={selectedTournamentId}
              onChange={(event) => updateFilter('tournamentId', event.target.value)}
            >
              <option value="">{t(locale, 'adminMatches.selectTournament')}</option>
              {(tournaments || []).map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </label>

        </div>

        {actionError ? <p className="mt-4 text-sm font-medium text-red-600">{actionError}</p> : null}
        {actionSuccess ? <p className="mt-4 text-sm font-medium text-emerald-600">{actionSuccess}</p> : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6 lg:p-7">
        {loading ? <p className="text-sm text-slate-500">{t(locale, 'adminMatches.loading')}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

        {!loading && !error && matches.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t(locale, 'adminMatches.empty')}
          </div>
        ) : null}

        <div className="space-y-6">
          {sortedGroupedMatches.map(([key, items]) => (
            <section key={key} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="display-title text-2xl text-[#0F172A]">{items[0].round}</h3>
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
                            {shouldShowBracketLabel(match.bracketLabel, match.skillLevel) ? (
                              <h4 className="text-lg font-bold text-slate-900">{match.bracketLabel}</h4>
                            ) : null}
                            <StatusBadge tone={match.status}>{t(locale, 'status.' + match.status)}</StatusBadge>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              {match.rawTableNo || t(locale, 'adminMatches.tableTbc')}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-slate-500">{formatMatchTime(match.scheduledAt)}</p>
                          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                            <p>{t(locale, 'adminMatches.player1')}: {formatScheduledPlayerName(match.player1Name, match.player1SkillLevel || match.skillLevel, locale) || t(locale, 'adminMatches.waitingSlot')}</p>
                            <p>{t(locale, 'adminMatches.player2')}: {formatScheduledPlayerName(match.player2Name, match.player2SkillLevel || match.skillLevel, locale) || t(locale, 'adminMatches.waitingSlot')}</p>
                            <p>{t(locale, 'adminMatches.raceTo', { value: match.raceTo })}</p>
                            <p>{match.rawTableNo ? t(locale, 'adminMatches.tableQrHint') : t(locale, 'adminMatches.assignTableHint')}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            { label: formatScheduledPlayerName(match.player1Name, match.player1SkillLevel || match.skillLevel, locale) || t(locale, 'adminMatches.player1'), field: 'player1Score', value: draft.player1Score },
                            { label: formatScheduledPlayerName(match.player2Name, match.player2SkillLevel || match.skillLevel, locale) || t(locale, 'adminMatches.player2'), field: 'player2Score', value: draft.player2Score },
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
                        <div className="grid gap-3">
                          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{t(locale, 'adminMatches.schedule')}</p>
                              <button
                                type="button"
                                disabled={busyMatchId === match.id}
                                onClick={() => handleScheduleSave(match)}
                                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                              >
                                {t(locale, 'adminMatches.saveSchedule')}
                              </button>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                                <option value="">{t(locale, 'adminMatches.unassignedTable')}</option>
                                {tableOptions.map((tableNo) => (
                                  <option key={tableNo} value={tableNo}>
                                    {tableNo}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">{t(locale, 'adminMatches.tableQr')}</p>
                                <p className="mt-2 text-base font-semibold text-slate-700">{match.rawTableNo || t(locale, 'adminMatches.assignTableFirst')}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{t(locale, 'adminMatches.tableQrDescription')}</p>
                              </div>
                              {tableQrPayload && !isCompleted ? (
                                <img src={tableQrPayload.qrCodeDataUrl} alt="Table QR" className="h-28 w-28 self-start rounded-xl border border-slate-200 p-1" />
                              ) : null}
                            </div>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                disabled={busyMatchId === match.id || !match.rawTableNo || isCompleted}
                                onClick={() => handleQrGenerate(match)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                              >
                                {t(locale, 'adminMatches.generateTableQr')}
                              </button>
                              {tableQrPayload && !isCompleted ? (
                                <a
                                  href={tableQrPayload.scoreUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                                >
                                  {t(locale, 'adminMatches.openTableScorePage')}
                                </a>
                              ) : null}
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
                          {isCompleted ? t(locale, 'adminMatches.saveScoreCorrection') : t(locale, 'adminMatches.finishMatch')}
                        </button>

                        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">
                          {isCompleted ? t(locale, 'adminMatches.correctionHint') : t(locale, 'adminMatches.liveScoreHint')}
                        </p>
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
