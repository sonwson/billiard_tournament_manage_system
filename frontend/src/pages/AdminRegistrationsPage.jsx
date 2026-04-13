import { Check, Plus, RefreshCw, ShieldAlert, UserRoundPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SectionHeader from '../components/ui/SectionHeader'
import StatusBadge from '../components/ui/StatusBadge'
import { useAsyncData } from '../hooks/useAsyncData'
import { playerService, registrationService, tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { SKILL_LEVEL_OPTIONS } from '../utils/uiConstants'
import { formatMatchTime } from '../utils/formatters'
import { t } from '../utils/i18n'

function AdminRegistrationsPage() {
  const locale = useAppStore((state) => state.locale)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTournamentId = searchParams.get('tournamentId') || ''
  const selectedStatus = searchParams.get('status') || ''
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [busyRegistrationId, setBusyRegistrationId] = useState('')
  const [removingPlayerId, setRemovingPlayerId] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [entryMode, setEntryMode] = useState('existing')
  const [directEntryForm, setDirectEntryForm] = useState({
    playerIds: [],
  })
  const [quickCreateForm, setQuickCreateForm] = useState({
    displayName: '',
    phone: '',
    email: '',
    skillLevel: 'CN',
  })

  const tournamentsLoader = useCallback(() => tournamentService.listManageable(), [])
  const {
    data: tournaments,
    loading: tournamentsLoading,
    error: tournamentsError,
  } = useAsyncData(tournamentsLoader)

  const playersLoader = useCallback(() => playerService.list({ limit: 200 }), [])
  const { data: players } = useAsyncData(playersLoader)

  const registrationsLoader = useCallback(async () => {
    if (!selectedTournamentId) {
      return { items: [], meta: null }
    }

    return tournamentService.listRegistrations(selectedTournamentId, {
      status: selectedStatus || undefined,
      limit: 100,
    })
  }, [selectedTournamentId, selectedStatus])

  const {
    data: registrationData,
    loading: registrationsLoading,
    error: registrationsError,
    setData: setRegistrationData,
  } = useAsyncData(registrationsLoader)

  const registrations = useMemo(() => registrationData?.items || [], [registrationData])
  const unavailablePlayerIds = useMemo(
    () => new Set(registrations.map((registration) => registration.player.id).filter(Boolean)),
    [registrations],
  )
  const selectablePlayers = useMemo(
    () => (players || []).filter((player) => !unavailablePlayerIds.has(player.id)),
    [players, unavailablePlayerIds],
  )

  useEffect(() => {
    if (!selectedTournamentId && tournaments?.length) {
      setSearchParams({
        tournamentId: tournaments[0].id,
        ...(selectedStatus ? { status: selectedStatus } : {}),
      })
    }
  }, [selectedStatus, selectedTournamentId, setSearchParams, tournaments])

  async function handleReview(registrationId, action) {
    setBusyRegistrationId(registrationId)
    setActionError('')
    setActionSuccess('')

    try {
      const payload = action === 'reject'
        ? { action, rejectionReason: 'Rejected by admin' }
        : { action }
      const updated = await registrationService.review(registrationId, payload)

      setRegistrationData((current) => ({
        ...current,
        items: (current?.items || []).map((item) => (
          item.id === registrationId
            ? {
                ...item,
                ...updated,
                player: item.player,
                user: item.user,
              }
            : item
        )),
      }))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminRegistrations.reviewFailed'))
    } finally {
      setBusyRegistrationId('')
    }
  }

  async function handleRemovePlayer(playerId) {
    if (!selectedTournamentId) return

    setRemovingPlayerId(playerId)
    setActionError('')
    setActionSuccess('')

    try {
      await tournamentService.removePlayer(selectedTournamentId, playerId)
      await reloadRegistrations()
      setActionSuccess(t(locale, 'adminRegistrations.removedSuccess'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminRegistrations.removeFailed'))
    } finally {
      setRemovingPlayerId('')
    }
  }

  async function reloadRegistrations() {
    if (!selectedTournamentId) return

    const refreshed = await tournamentService.listRegistrations(selectedTournamentId, {
      status: selectedStatus || undefined,
      limit: 100,
    })
    setRegistrationData(refreshed)
  }

  async function handleDirectAdd(event) {
    event.preventDefault()

    if (!selectedTournamentId || !directEntryForm.playerIds.length) {
      setActionError(t(locale, 'adminRegistrations.selectPlayerFirst'))
      return
    }

    setAddingPlayer(true)
    setActionError('')
    setActionSuccess('')

    try {
      // Use each player's existing skillLevel
      const results = await Promise.allSettled(
        directEntryForm.playerIds.map((playerId) => {
          const player = players?.find((p) => p.id === playerId)
          return tournamentService.register(selectedTournamentId, {
            playerId,
            skillLevel: player?.skillLevel || 'CN',
          })
        }),
      )

      const successCount = results.filter((result) => result.status === 'fulfilled').length
      const failedCount = results.length - successCount

      await reloadRegistrations()
      setDirectEntryForm({
        playerIds: [],
      })
      setActionSuccess(
        failedCount
          ? t(locale, 'adminRegistrations.playerAddPartial', { success: successCount, failed: failedCount })
          : t(locale, 'adminRegistrations.playerAddSuccess', { count: successCount }),
      )
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminRegistrations.addPlayerFailed'))
    } finally {
      setAddingPlayer(false)
    }
  }

  function toggleExistingPlayer(playerId) {
    setDirectEntryForm((current) => ({
      ...current,
      playerIds: current.playerIds.includes(playerId)
        ? current.playerIds.filter((id) => id !== playerId)
        : [...current.playerIds, playerId],
    }))
  }

  function selectAllExistingPlayers() {
    setDirectEntryForm((current) => ({
      ...current,
      playerIds: selectablePlayers.map((player) => player.id),
    }))
  }

  function clearExistingSelection() {
    setDirectEntryForm((current) => ({
      ...current,
      playerIds: [],
    }))
  }

  async function handleQuickCreate(event) {
    event.preventDefault()

    if (!selectedTournamentId) {
      setActionError(t(locale, 'adminRegistrations.selectTournamentFirst'))
      return
    }

    setAddingPlayer(true)
    setActionError('')
    setActionSuccess('')

    try {
      const createdPlayer = await playerService.create({
        displayName: quickCreateForm.displayName,
        phone: quickCreateForm.phone,
        email: quickCreateForm.email,
        skillLevel: quickCreateForm.skillLevel,
        city: 'International',
      })

      await tournamentService.register(selectedTournamentId, {
        playerId: createdPlayer.id,
        skillLevel: quickCreateForm.skillLevel,
      })

      await reloadRegistrations()
      setQuickCreateForm({
        displayName: '',
        phone: '',
        email: '',
        skillLevel: quickCreateForm.skillLevel,
      })
      setActionSuccess(t(locale, 'adminRegistrations.quickAddSuccess'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminRegistrations.quickAddFailed'))
    } finally {
      setAddingPlayer(false)
    }
  }

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams)

    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }

    setSearchParams(next)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <SectionHeader
          eyebrow={t(locale, 'adminRegistrations.eyebrow')}
          title={t(locale, 'adminRegistrations.title')}
          description={t(locale, 'adminRegistrations.description')}
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.tournament')}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
              value={selectedTournamentId}
              onChange={(event) => updateFilter('tournamentId', event.target.value)}
            >
              <option value="">{tournamentsLoading ? t(locale, 'adminRegistrations.loadingTournaments') : t(locale, 'adminRegistrations.selectTournament')}</option>
              {(tournaments || []).map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.status')}</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
              value={selectedStatus}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">{t(locale, 'common.allStatuses')}</option>
              <option value="pending">{t(locale, 'status.pending')}</option>
              <option value="approved">{t(locale, 'status.approved')}</option>
              <option value="rejected">{t(locale, 'status.rejected')}</option>
              <option value="cancelled">{t(locale, 'status.cancelled')}</option>
            </select>
          </label>
        </div>

        {tournamentsError ? <p className="mt-4 text-sm font-medium text-red-600">{tournamentsError.message}</p> : null}
        {actionError ? <p className="mt-4 text-sm font-medium text-red-600">{actionError}</p> : null}
        {actionSuccess ? <p className="mt-4 text-sm font-medium text-emerald-600">{actionSuccess}</p> : null}

        {selectedTournamentId ? (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEntryMode('existing')}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  entryMode === 'existing'
                    ? 'bg-[#0F172A] text-white'
                    : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {t(locale, 'adminRegistrations.existingPlayer')}
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('quick')}
                className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  entryMode === 'quick'
                    ? 'bg-[#0F172A] text-white'
                    : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                {t(locale, 'adminRegistrations.quickAddPlayer')}
              </button>
            </div>

            {entryMode === 'existing' ? (
              <form onSubmit={handleDirectAdd} className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.addExistingPlayers')}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {directEntryForm.playerIds.length
                        ? t(locale, 'adminRegistrations.selectedPlayers', { count: directEntryForm.playerIds.length })
                        : t(locale, 'adminRegistrations.choosePlayersHint')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllExistingPlayers}
                      disabled={!selectablePlayers.length}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {t(locale, 'adminRegistrations.selectAll')}
                    </button>
                    <button
                      type="button"
                      onClick={clearExistingSelection}
                      disabled={!directEntryForm.playerIds.length}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                    >
                      {t(locale, 'adminRegistrations.clear')}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {selectablePlayers.length ? (
                        selectablePlayers.map((player) => {
                          const active = directEntryForm.playerIds.includes(player.id)

                          return (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => toggleExistingPlayer(player.id)}
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                                active
                                  ? 'border-[#EAB308] bg-amber-50 text-slate-900'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{player.name}</p>
                                <p className="truncate text-xs text-slate-500">{player.country}</p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                                active ? 'bg-[#0F172A] text-white' : 'bg-white text-slate-500'
                              }`}>
                                {active ? t(locale, 'adminRegistrations.selected') : t(locale, 'adminRegistrations.select')}
                              </span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                          {t(locale, 'adminRegistrations.noAvailablePlayers')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={addingPlayer || !directEntryForm.playerIds.length}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
                    >
                      {addingPlayer ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add Selected Players
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleQuickCreate} className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.playerName')}</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                    value={quickCreateForm.displayName}
                    onChange={(event) => setQuickCreateForm((current) => ({ ...current, displayName: event.target.value }))}
                    placeholder={t(locale, 'adminRegistrations.playerNamePlaceholder')}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.phone')}</span>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                    value={quickCreateForm.phone}
                    onChange={(event) => setQuickCreateForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={t(locale, 'adminRegistrations.phonePlaceholder')}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.email')}</span>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                    value={quickCreateForm.email}
                    onChange={(event) => setQuickCreateForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t(locale, 'adminRegistrations.emailPlaceholder')}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.skillLevel')}</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                    value={quickCreateForm.skillLevel}
                    onChange={(event) => setQuickCreateForm((current) => ({ ...current, skillLevel: event.target.value }))}
                  >
                    {SKILL_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(locale, `skillLevels.${option.value}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="lg:col-span-2 flex items-end">
                  <button
                    type="submit"
                    disabled={addingPlayer}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
                  >
                    {addingPlayer ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" />}
                    {t(locale, 'adminRegistrations.createAndAddPlayer')}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#EAB308]">{t(locale, 'adminRegistrations.reviewQueue')}</p>
            <h2 className="display-title mt-2 text-3xl text-[#0F172A]">{t(locale, 'adminRegistrations.registrationRequests')}</h2>
          </div>
          {selectedTournamentId ? (
            <Link
              to={`/admin/tournaments?tournamentId=${selectedTournamentId}`}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              {t(locale, 'adminRegistrations.backToTournaments')}
            </Link>
          ) : null}
        </div>

        {!selectedTournamentId ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t(locale, 'adminRegistrations.selectTournamentEmpty')}
          </div>
        ) : null}

        {selectedTournamentId && registrationsLoading ? (
          <p className="text-sm text-slate-500">{t(locale, 'adminRegistrations.loadingRegistrations')}</p>
        ) : null}

        {selectedTournamentId && registrationsError ? (
          <p className="text-sm font-medium text-red-600">{registrationsError.message}</p>
        ) : null}

        {selectedTournamentId && !registrationsLoading && !registrationsError && registrations.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t(locale, 'adminRegistrations.emptyRegistrations')}
          </div>
        ) : null}

        {selectedTournamentId && registrations.length > 0 ? (
          <div className="space-y-4">
            {registrations.map((registration) => {
              const isBusy = busyRegistrationId === registration.id
              const canReview = registration.status === 'pending'

              return (
                <article
                  key={registration.id}
                  className="grid gap-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 xl:grid-cols-[1.2fr_0.8fr_0.8fr]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">{registration.player.name}</h3>
                      <StatusBadge tone={registration.status}>{t(locale, 'status.' + registration.status)}</StatusBadge>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-500">
                      <p>{t(locale, 'adminRegistrations.user')}: {registration.user.name || t(locale, 'adminRegistrations.notAvailable')}</p>
                      <p>{t(locale, 'adminRegistrations.email')}: {registration.user.email || t(locale, 'adminRegistrations.notAvailable')}</p>
                      <p>{t(locale, 'adminRegistrations.club')}: {registration.player.club || t(locale, 'adminRegistrations.independent')}</p>
                      <p>{t(locale, 'adminRegistrations.city')}: {registration.player.city || t(locale, 'adminRegistrations.international')}</p>
                      <p>{t(locale, 'adminRegistrations.skillLevel')}: {t(locale, `skillLevels.${registration.skillLevel}`)}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-500">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.submitted')}</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {registration.registeredAt ? formatMatchTime(registration.registeredAt) : t(locale, 'adminRegistrations.notAvailable')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.rankingPoints')}</p>
                      <p className="mt-1 font-medium text-slate-800">{registration.player.rankingPoints}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRegistrations.seed')}</p>
                      <p className="mt-1 font-medium text-slate-800">{registration.seedingNumber || t(locale, 'adminRegistrations.seedPending')}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {canReview ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReview(registration.id, 'approve')}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                        >
                          {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          {t(locale, 'adminRegistrations.approvePlayer')}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReview(registration.id, 'reject')}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-70"
                        >
                          <X className="h-4 w-4" />
                          {t(locale, 'adminRegistrations.rejectEntry')}
                        </button>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                          <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-4 w-4 text-[#EAB308]" />
                            <div>
                              <p className="font-semibold text-slate-800">{t(locale, 'adminRegistrations.reviewCompleted')}</p>
                              <p className="mt-1">
                                {registration.status === 'rejected' && registration.rejectionReason
                                  ? registration.rejectionReason
                                  : t(locale, 'adminRegistrations.reviewCompletedFallback')}
                              </p>
                            </div>
                          </div>
                        </div>
                        {['approved', 'pending'].includes(registration.status) ? (
                          <button
                            type="button"
                            disabled={removingPlayerId === registration.player.id}
                            onClick={() => handleRemovePlayer(registration.player.id)}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                          >
                            {removingPlayerId === registration.player.id ? t(locale, 'adminRegistrations.removing') : t(locale, 'adminRegistrations.removeFromTournament')}
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminRegistrationsPage
