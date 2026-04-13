import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminTournamentForm from '../components/admin/AdminTournamentForm'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

const statuses = ['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished']
const sortOptions = [
  { value: 'created_desc' },
  { value: 'created_asc' },
  { value: 'prize_desc' },
  { value: 'prize_asc' },
  { value: 'alpha_asc' },
  { value: 'alpha_desc' },
]

function AdminTournamentsPage() {
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const isTotalAdmin = ['admin', 'super_admin'].includes(auth.user?.role)
  const [viewMode, setViewMode] = useState('active')
  const [submitting, setSubmitting] = useState(false)
  const [generatingId, setGeneratingId] = useState('')
  const [confirmRegenerateId, setConfirmRegenerateId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [editingTournamentId, setEditingTournamentId] = useState('')
  const [confirmDeleteTournamentId, setConfirmDeleteTournamentId] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState('created_desc')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const loader = useCallback(() => {
    if (viewMode === 'trash' && isTotalAdmin) {
      return tournamentService.listTrash()
    }
    return tournamentService.listManageable()
  }, [isTotalAdmin, viewMode])

  const { data, loading, error, setData } = useAsyncData(loader)
  const tournaments = useMemo(() => data || [], [data])
  const editingTournament = tournaments.find((item) => item.id === editingTournamentId) || null
  const isFormVisible = viewMode === 'active' && (showCreateForm || Boolean(editingTournament))

  const filteredTournaments = useMemo(() => {
    const normalizedKeyword = searchTerm.trim().toLowerCase()
    const filtered = normalizedKeyword
      ? tournaments.filter((item) => item.name?.toLowerCase().includes(normalizedKeyword))
      : [...tournaments]

    return filtered.sort((left, right) => {
      switch (sortMode) {
        case 'created_asc':
          return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime()
        case 'prize_desc':
          return (right.prizeFund || 0) - (left.prizeFund || 0)
        case 'prize_asc':
          return (left.prizeFund || 0) - (right.prizeFund || 0)
        case 'alpha_asc':
          return (left.name || '').localeCompare(right.name || '')
        case 'alpha_desc':
          return (right.name || '').localeCompare(left.name || '')
        case 'created_desc':
        default:
          return new Date(right.createdAt || right.deletedAt || 0).getTime() - new Date(left.createdAt || left.deletedAt || 0).getTime()
      }
    })
  }, [searchTerm, sortMode, tournaments])

  async function handleCreateTournament(payload) {
    setSubmitting(true)
    setActionError('')
    setActionSuccess('')
    try {
      const created = await tournamentService.create(payload)
      setData((current) => [created, ...(current || [])])
      setShowCreateForm(false)
      setActionSuccess(t(locale, 'adminTournaments.createdSuccess'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdateTournament(payload) {
    if (!editingTournamentId) return

    setSubmitting(true)
    setActionError('')
    setActionSuccess('')
    try {
      const updated = await tournamentService.update(editingTournamentId, payload)
      setData((current) => (current || []).map((item) => (item.id === editingTournamentId ? updated : item)))
      setEditingTournamentId('')
      setActionSuccess(t(locale, 'adminTournaments.updatedSuccess'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.updateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(tournamentId, status) {
    setActionError('')
    setActionSuccess('')
    try {
      const updated = await tournamentService.updateStatus(tournamentId, status)
      setData((current) => (current || []).map((item) => (item.id === tournamentId ? updated : item)))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.statusFailed'))
    }
  }

  async function handleGenerateBracket(tournamentId) {
    setGeneratingId(tournamentId)
    setActionError('')
    setActionSuccess('')

    try {
      const response = await tournamentService.generateBracket(tournamentId, {
        seedingMode: 'ranking',
        raceTo: 7,
      })

      setData((current) =>
        (current || []).map((item) => (
          item.id === tournamentId
            ? { ...item, bracketGeneratedAt: new Date().toISOString() }
            : item
        )),
      )
      setActionSuccess(t(locale, 'adminTournaments.bracketCreated', { count: response.data?.matchesCreated || 0 }))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.bracketFailed'))
    } finally {
      setGeneratingId('')
    }
  }

  async function handleRegenerateBracket(tournamentId) {
    setGeneratingId(tournamentId)
    setConfirmRegenerateId('')
    setActionError('')
    setActionSuccess('')

    try {
      const response = await tournamentService.regenerateBracket(tournamentId, {
        seedingMode: 'ranking',
        raceTo: 7,
      })

      setData((current) =>
        (current || []).map((item) => (
          item.id === tournamentId
            ? { ...item, bracketGeneratedAt: new Date().toISOString() }
            : item
        )),
      )
      setActionSuccess(t(locale, 'adminTournaments.bracketRegenerated', { count: response.data?.matchesCreated || 0 }))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.bracketFailed'))
    } finally {
      setGeneratingId('')
    }
  }

  async function handleDeleteTournament(tournamentId) {
    setDeletingId(tournamentId)
    setConfirmDeleteTournamentId('')
    setActionError('')
    setActionSuccess('')

    try {
      await tournamentService.remove(tournamentId)
      setData((current) => (current || []).filter((item) => item.id !== tournamentId))
      setActionSuccess(isTotalAdmin ? t(locale, 'adminTournaments.movedToTrash') : t(locale, 'adminTournaments.deletedSuccess'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.deleteFailed'))
    } finally {
      setDeletingId('')
    }
  }

  async function handleRestoreTournament(tournamentId) {
    setDeletingId(tournamentId)
    setActionError('')
    setActionSuccess('')

    try {
      await tournamentService.restore(tournamentId)
      setData((current) => (current || []).filter((item) => item.id !== tournamentId))
      setActionSuccess(t(locale, 'adminTournaments.restoredSuccess'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.restoreFailed'))
    } finally {
      setDeletingId('')
    }
  }

  async function handlePermanentDelete(tournamentId) {
    setDeletingId(tournamentId)
    setConfirmDeleteTournamentId('')
    setActionError('')
    setActionSuccess('')

    try {
      await tournamentService.removePermanently(tournamentId)
      setData((current) => (current || []).filter((item) => item.id !== tournamentId))
      setActionSuccess(t(locale, 'adminTournaments.permanentDeleted'))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminTournaments.permanentDeleteFailed'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <SectionHeader
          eyebrow={editingTournament ? t(locale, 'adminTournaments.editEyebrow') : viewMode === 'trash' ? t(locale, 'adminTournaments.trashEyebrow') : t(locale, 'adminTournaments.actionsEyebrow')}
          title={viewMode === 'trash' ? t(locale, 'adminTournaments.trashTitle') : t(locale, 'adminTournaments.title')}
          description={viewMode === 'trash'
            ? t(locale, 'adminTournaments.trashDescription')
            : editingTournament
              ? t(locale, 'adminTournaments.editDescription', { name: editingTournament.name })
              : t(locale, 'adminTournaments.createDescription')}
          action={viewMode === 'active' && !editingTournament ? (
            <button
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-50 px-5 py-3 text-sm font-bold text-[#14213D] ring-1 ring-[#EAB308]/40 transition hover:bg-amber-100"
            >
              {showCreateForm ? t(locale, 'adminTournaments.closeCreateForm') : t(locale, 'adminTournaments.createTournament')}
            </button>
          ) : null}
        />

        {isTotalAdmin ? (
          <div className="mb-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setViewMode('active')
                setConfirmDeleteTournamentId('')
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${viewMode === 'active' ? 'bg-[#0F172A] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {t(locale, 'adminTournaments.activeTournaments')}
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('trash')
                setShowCreateForm(false)
                setEditingTournamentId('')
                setConfirmDeleteTournamentId('')
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${viewMode === 'trash' ? 'bg-rose-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {t(locale, 'adminTournaments.trash')}
            </button>
          </div>
        ) : null}

        {actionError ? <p className="mb-4 text-sm font-medium text-red-600">{actionError}</p> : null}
        {actionSuccess ? <p className="mb-4 text-sm font-medium text-emerald-600">{actionSuccess}</p> : null}

        {isFormVisible ? (
          <AdminTournamentForm
            key={editingTournamentId || 'create'}
            onSubmit={editingTournament ? handleUpdateTournament : handleCreateTournament}
            submitting={submitting}
            initialValues={editingTournament}
            mode={editingTournament ? 'edit' : 'create'}
            onCancel={editingTournament ? () => setEditingTournamentId('') : () => setShowCreateForm(false)}
          />
        ) : viewMode === 'active' ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t(locale, 'adminTournaments.createFormHidden')}
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#EAB308]">{viewMode === 'trash' ? t(locale, 'adminTournaments.deletedEvents') : t(locale, 'adminTournaments.existingEvents')}</p>
          <h2 className="display-title mt-2 text-3xl text-[#0F172A]">{viewMode === 'trash' ? t(locale, 'adminTournaments.trashBin') : t(locale, 'adminTournaments.listTitle')}</h2>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminTournaments.filterByName')}</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={viewMode === 'trash' ? t(locale, 'adminTournaments.searchDeletedPlaceholder') : t(locale, 'adminTournaments.searchPlaceholder')}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 outline-none transition focus:border-[#EAB308]"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminTournaments.sortBy')}</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 outline-none transition focus:border-[#EAB308]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(locale, 'sortOptions.' + option.value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-4">
          {loading ? <p className="text-sm text-slate-500">{t(locale, 'adminTournaments.loading')}</p> : null}
          {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}
          {!loading && !error && filteredTournaments.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              {viewMode === 'trash' ? t(locale, 'adminTournaments.trashEmpty') : t(locale, 'adminTournaments.emptyFiltered')}
            </div>
          ) : null}

          {filteredTournaments.map((tournament) => (
            <article
              key={tournament.id}
              className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 xl:grid-cols-[1.1fr_0.5fr_0.8fr_0.8fr]"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900">{tournament.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{tournament.location}</p>
                <p className="mt-2 text-sm text-slate-500">{tournament.eventClassLabel}</p>
                <p className="mt-2 text-sm text-slate-500">{t(locale, 'adminTournaments.players', { current: tournament.approvedPlayerCount || 0, total: tournament.fieldSize })}</p>
                <p className="mt-2 text-sm text-slate-500">{tournament.bracketGeneratedAt ? t(locale, 'adminTournaments.bracketReady') : t(locale, 'adminTournaments.bracketNotGenerated')}</p>
                {tournament.raceToRules?.length ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {t(locale, 'adminTournaments.raceTo', { rules: tournament.raceToRules.map((item) => `R${item.roundNumber}:${item.raceTo}`).join(' | ') })}
                  </p>
                ) : null}
                {tournament.rawFormat === 'double_elimination' ? (
                  <p className="mt-2 text-sm text-slate-500">
                    {t(locale, 'adminTournaments.deQualifier', { size: tournament.bracketSettings?.knockoutStartSize || 16 })}
                  </p>
                ) : null}
                {viewMode === 'trash' && tournament.deletedAt ? (
                  <p className="mt-2 text-sm text-rose-600">{t(locale, 'adminTournaments.deletedAt', { date: new Date(tournament.deletedAt).toLocaleString() })}</p>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminTournaments.currentStatus')}</p>
                <p className="mt-2 font-semibold text-slate-900">{t(locale, 'status.' + (tournament.rawStatus || tournament.status))}</p>
              </div>

              {viewMode === 'active' ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminTournaments.updateStatus')}</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                    value={tournament.rawStatus || tournament.status}
                    onChange={(event) => handleStatusChange(tournament.id, event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {t(locale, 'status.' + status)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : <div />}

              <div className="grid gap-3">
                {viewMode === 'active' ? (
                  <>
                    {!tournament.bracketGeneratedAt ? (
                      <button
                        type="button"
                        disabled={generatingId === tournament.id}
                        onClick={() => handleGenerateBracket(tournament.id)}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
                      >
                        {generatingId === tournament.id ? t(locale, 'adminTournaments.generating') : t(locale, 'adminTournaments.generateBracket')}
                      </button>
                    ) : (
                      <>
                        {confirmRegenerateId === tournament.id ? (
                          <div className="grid gap-2">
                            <p className="text-xs font-medium text-amber-700">{t(locale, 'adminTournaments.regenerateConfirm')}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleRegenerateBracket(tournament.id)}
                                disabled={generatingId === tournament.id}
                                className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
                              >
                                {generatingId === tournament.id ? t(locale, 'adminTournaments.regenerating') : t(locale, 'adminTournaments.confirmRegenerate')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRegenerateId('')}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                {t(locale, 'adminTournaments.cancel')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRegenerateId(tournament.id)}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                          >
                            {t(locale, 'adminTournaments.regenerateBracket')}
                          </button>
                        )}
                      </>
                    )}
                    <Link
                      to={`/admin/registrations?tournamentId=${tournament.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      {t(locale, 'adminTournaments.reviewRegistrations')}
                    </Link>
                    <Link
                      to={`/admin/matches?tournamentId=${tournament.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      {t(locale, 'adminTournaments.manageMatches')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTournamentId(tournament.id)
                        setShowCreateForm(false)
                      }}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      {t(locale, 'adminTournaments.editTournament')}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === tournament.id || tournament.rawStatus === 'ongoing' || tournament.status === 'live'}
                      onClick={() => setConfirmDeleteTournamentId(tournament.id)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingId === tournament.id ? t(locale, 'adminTournaments.deleting') : isTotalAdmin ? t(locale, 'adminTournaments.moveToTrash') : t(locale, 'adminTournaments.deleteTournament')}
                    </button>
                    {confirmDeleteTournamentId === tournament.id ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm font-semibold text-rose-700">{t(locale, 'adminTournaments.confirmDeletionTitle')}</p>
                        <p className="mt-1 text-xs text-rose-600">
                          {isTotalAdmin
                            ? t(locale, 'adminTournaments.confirmDeletionBodyAdmin')
                            : t(locale, 'adminTournaments.confirmDeletionBodyManager')}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => handleDeleteTournament(tournament.id)}
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            {t(locale, 'adminTournaments.confirmDelete')}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => setConfirmDeleteTournamentId('')}
                            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {t(locale, 'adminTournaments.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={deletingId === tournament.id}
                      onClick={() => handleRestoreTournament(tournament.id)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {deletingId === tournament.id ? t(locale, 'adminTournaments.restoring') : t(locale, 'adminTournaments.restoreTournament')}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === tournament.id}
                      onClick={() => setConfirmDeleteTournamentId(tournament.id)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingId === tournament.id ? t(locale, 'adminTournaments.deleting') : t(locale, 'adminTournaments.deletePermanently')}
                    </button>
                    {confirmDeleteTournamentId === tournament.id ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm font-semibold text-rose-700">{t(locale, 'adminTournaments.confirmPermanentDeleteTitle')}</p>
                        <p className="mt-1 text-xs text-rose-600">
                          {t(locale, 'adminTournaments.confirmPermanentDeleteBody')}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => handlePermanentDelete(tournament.id)}
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            {t(locale, 'adminTournaments.confirmPermanentDelete')}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => setConfirmDeleteTournamentId('')}
                            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {t(locale, 'adminTournaments.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminTournamentsPage
