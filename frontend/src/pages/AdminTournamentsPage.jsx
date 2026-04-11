import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminTournamentForm from '../components/admin/AdminTournamentForm'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'

const statuses = ['draft', 'open_registration', 'closed_registration', 'ongoing', 'finished']
const sortOptions = [
  { value: 'created_desc', label: 'Newest Created' },
  { value: 'created_asc', label: 'Oldest Created' },
  { value: 'prize_desc', label: 'Highest Prize Fund' },
  { value: 'prize_asc', label: 'Lowest Prize Fund' },
  { value: 'alpha_asc', label: 'Name A-Z' },
  { value: 'alpha_desc', label: 'Name Z-A' },
]

function AdminTournamentsPage() {
  const auth = useAppStore((state) => state.auth)
  const isTotalAdmin = ['admin', 'super_admin'].includes(auth.user?.role)
  const [viewMode, setViewMode] = useState('active')
  const [submitting, setSubmitting] = useState(false)
  const [generatingId, setGeneratingId] = useState('')
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
      setActionSuccess('Tournament created successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to create tournament')
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
      setActionSuccess('Tournament updated successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to update tournament')
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
      setActionError(caughtError.message || 'Unable to update tournament status')
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
      setActionSuccess(`Bracket created successfully with ${response.data?.matchesCreated || 0} matches.`)
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to generate bracket')
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
      setActionSuccess(isTotalAdmin ? 'Tournament moved to trash successfully.' : 'Tournament deleted successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to delete tournament')
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
      setActionSuccess('Tournament restored successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to restore tournament')
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
      setActionSuccess('Tournament permanently deleted.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to permanently delete tournament')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <SectionHeader
          eyebrow={editingTournament ? 'Edit Event' : viewMode === 'trash' ? 'Tournament Trash' : 'Tournament Actions'}
          title={viewMode === 'trash' ? 'Tournament Trash' : 'Manage Tournaments'}
          description={viewMode === 'trash'
            ? 'Restore tournaments from trash or permanently delete them when you are completely sure.'
            : editingTournament
              ? `Update ${editingTournament.name} without leaving the admin workspace.`
              : 'Create new events only when needed, then manage lifecycle states from the list below.'}
          action={viewMode === 'active' && !editingTournament ? (
            <button
              type="button"
              onClick={() => setShowCreateForm((current) => !current)}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-50 px-5 py-3 text-sm font-bold text-[#14213D] ring-1 ring-[#EAB308]/40 transition hover:bg-amber-100"
            >
              {showCreateForm ? 'Close Create Form' : 'Create Tournament'}
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
              Active Tournaments
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
              Trash
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
            The create form is hidden by default. Use <span className="font-semibold text-slate-700">Create Tournament</span> to open it.
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#EAB308]">{viewMode === 'trash' ? 'Deleted Events' : 'Existing Events'}</p>
          <h2 className="display-title mt-2 text-3xl text-[#0F172A]">{viewMode === 'trash' ? 'Trash Bin' : 'Tournament List'}</h2>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Filter By Name</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={viewMode === 'trash' ? 'Search deleted tournaments by name' : 'Search tournaments by name'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 outline-none transition focus:border-[#EAB308]"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sort By</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700 outline-none transition focus:border-[#EAB308]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-4">
          {loading ? <p className="text-sm text-slate-500">Loading tournaments...</p> : null}
          {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}
          {!loading && !error && filteredTournaments.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              {viewMode === 'trash' ? 'Trash is empty.' : 'No tournaments match the current filter.'}
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
                <p className="mt-2 text-sm text-slate-500">Players {tournament.approvedPlayerCount || 0}/{tournament.fieldSize}</p>
                <p className="mt-2 text-sm text-slate-500">{tournament.bracketGeneratedAt ? 'Bracket ready' : 'Bracket not generated'}</p>
                {tournament.raceToRules?.length ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Race to: {tournament.raceToRules.map((item) => `R${item.roundNumber}:${item.raceTo}`).join(' | ')}
                  </p>
                ) : null}
                {tournament.rawFormat === 'double_elimination' ? (
                  <p className="mt-2 text-sm text-slate-500">
                    DE qualifier: Knockout starts from Last {tournament.bracketSettings?.knockoutStartSize || 16}
                  </p>
                ) : null}
                {viewMode === 'trash' && tournament.deletedAt ? (
                  <p className="mt-2 text-sm text-rose-600">Deleted at {new Date(tournament.deletedAt).toLocaleString()}</p>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Current Status</p>
                <p className="mt-2 font-semibold text-slate-900">{tournament.rawStatus || tournament.status}</p>
              </div>

              {viewMode === 'active' ? (
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Update Status</span>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                    value={tournament.rawStatus || tournament.status}
                    onChange={(event) => handleStatusChange(tournament.id, event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : <div />}

              <div className="grid gap-3">
                {viewMode === 'active' ? (
                  <>
                    <button
                      type="button"
                      disabled={generatingId === tournament.id || !!tournament.bracketGeneratedAt}
                      onClick={() => handleGenerateBracket(tournament.id)}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0F172A] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
                    >
                      {generatingId === tournament.id ? 'Generating...' : tournament.bracketGeneratedAt ? 'Bracket Generated' : 'Generate Bracket'}
                    </button>
                    <Link
                      to={`/admin/registrations?tournamentId=${tournament.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      Review Registrations
                    </Link>
                    <Link
                      to={`/admin/matches?tournamentId=${tournament.id}`}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      Manage Matches
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTournamentId(tournament.id)
                        setShowCreateForm(false)
                      }}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit Tournament
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === tournament.id || tournament.rawStatus === 'ongoing' || tournament.status === 'live'}
                      onClick={() => setConfirmDeleteTournamentId(tournament.id)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingId === tournament.id ? 'Deleting...' : isTotalAdmin ? 'Move To Trash' : 'Delete Tournament'}
                    </button>
                    {confirmDeleteTournamentId === tournament.id ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm font-semibold text-rose-700">Confirm tournament deletion?</p>
                        <p className="mt-1 text-xs text-rose-600">
                          {isTotalAdmin
                            ? 'This tournament will be moved to trash first. You can restore it later or permanently delete it from trash.'
                            : 'This tournament will be removed from your active list. Ongoing tournaments cannot be deleted.'}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => handleDeleteTournament(tournament.id)}
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => setConfirmDeleteTournamentId('')}
                            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            Cancel
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
                      {deletingId === tournament.id ? 'Restoring...' : 'Restore Tournament'}
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === tournament.id}
                      onClick={() => setConfirmDeleteTournamentId(tournament.id)}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingId === tournament.id ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                    {confirmDeleteTournamentId === tournament.id ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
                        <p className="text-sm font-semibold text-rose-700">Delete permanently?</p>
                        <p className="mt-1 text-xs text-rose-600">
                          This will permanently remove the tournament and related registrations, matches, and tournament ranking history.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => handlePermanentDelete(tournament.id)}
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                          >
                            Confirm Permanent Delete
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === tournament.id}
                            onClick={() => setConfirmDeleteTournamentId('')}
                            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            Cancel
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
