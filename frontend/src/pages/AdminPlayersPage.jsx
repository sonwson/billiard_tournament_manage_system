import { useCallback, useState } from 'react'
import { Edit2, Save, X, UserMinus } from 'lucide-react'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { playerService, userService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { SKILL_LEVEL_OPTIONS } from '../utils/uiConstants'
import { t } from '../utils/i18n'

function AdminPlayersPage() {
  const locale = useAppStore((state) => state.locale)
  const auth = useAppStore((state) => state.auth)
  const loader = useCallback(() => playerService.list({ limit: 500 }), [])
  const { data: players, loading, error, setData } = useAsyncData(loader)
  
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [busyPlayerIds, setBusyPlayerIds] = useState([])
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  
  const isSuperAdmin = ['admin', 'super_admin'].includes(auth.user?.role)

  function handleEditPlayer(player) {
    setEditingPlayerId(player.id)
    setEditForm({
      displayName: player.name,
      skillLevel: player.skillLevel || 'CN',
      club: player.club || '',
      city: player.city || '',
    })
  }

  function handleCancelEdit() {
    setEditingPlayerId(null)
    setEditForm({})
  }

  async function handleSavePlayer(playerId) {
    setBusyPlayerIds((current) => [...current, playerId])
    setActionError('')
    setActionSuccess('')

    try {
      const updatedPlayer = await playerService.update(playerId, editForm)
      setData((current) =>
        (current || []).map((player) =>
          player.id === playerId ? { ...player, ...updatedPlayer } : player
        )
      )
      setEditingPlayerId(null)
      setActionSuccess(t(locale, 'adminPlayers.updateSuccess'))
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminPlayers.updateFailed'))
    } finally {
      setBusyPlayerIds((current) => current.filter((id) => id !== playerId))
    }
  }

  function handleToggleSelection(playerId) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    )
  }

  function handleSelectAll() {
    setSelectedPlayerIds((players || []).map((player) => player.id))
  }

  function handleClearSelection() {
    setSelectedPlayerIds([])
  }

  async function handleDowngradePlayer(playerId) {
    if (!isSuperAdmin) return

    setBusyPlayerIds((current) => [...current, playerId])
    setActionError('')
    setActionSuccess('')

    try {
      const confirmed = window.confirm(
        t(locale, 'adminPlayers.downgradeConfirm')
      )
      if (!confirmed) return

      await userService.downgradeTournamentAdmin(playerId)
      setData((current) =>
        (current || []).map((player) =>
          player.id === playerId
            ? { ...player, role: 'user', isTournamentAdmin: false }
            : player
        )
      )
      setActionSuccess(t(locale, 'adminPlayers.downgradeSuccess'))
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminPlayers.downgradeFailed'))
    } finally {
      setBusyPlayerIds((current) => current.filter((id) => id !== playerId))
    }
  }

  async function handleDeletePlayer(playerId) {
    if (!isSuperAdmin) return

    setBusyPlayerIds((current) => [...current, playerId])
    setActionError('')
    setActionSuccess('')

    try {
      const confirmed = window.confirm(
        t(locale, 'adminPlayers.deleteConfirm')
      )
      if (!confirmed) return

      await playerService.remove(playerId)
      setData((current) => (current || []).filter((player) => player.id !== playerId))
      setSelectedPlayerIds((current) => current.filter((id) => id !== playerId))
      setActionSuccess(t(locale, 'adminPlayers.deleteSuccess'))
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminPlayers.deleteFailed'))
    } finally {
      setBusyPlayerIds((current) => current.filter((id) => id !== playerId))
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6 lg:p-7">
        <SectionHeader
          eyebrow={t(locale, 'adminPlayers.eyebrow')}
          title={t(locale, 'adminPlayers.title')}
          description={t(locale, 'adminPlayers.description')}
        />

        {isSuperAdmin && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t(locale, 'adminPlayers.selectAll')}
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={selectedPlayerIds.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t(locale, 'adminPlayers.clearSelection')}
            </button>
            {selectedPlayerIds.length > 0 && (
              <span className="text-sm font-medium text-slate-600">
                {t(locale, 'adminPlayers.selectedCount', { count: selectedPlayerIds.length })}
              </span>
            )}
          </div>
        )}

        {actionError && (
          <p className="mt-4 text-sm font-medium text-red-600">{actionError}</p>
        )}
        {actionSuccess && (
          <p className="mt-4 text-sm font-medium text-emerald-600">{actionSuccess}</p>
        )}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6 lg:p-7">
        {loading ? (
          <p className="text-sm text-slate-500">{t(locale, 'adminPlayers.loading')}</p>
        ) : null}
        {error ? (
          <p className="text-sm font-medium text-red-600">{error.message}</p>
        ) : null}

        {!loading && !error && (!players || players.length === 0) ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            {t(locale, 'adminPlayers.empty')}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    {t(locale, 'adminPlayers.select')}
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t(locale, 'adminPlayers.playerName')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t(locale, 'adminPlayers.skillLevel')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t(locale, 'adminPlayers.club')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t(locale, 'adminPlayers.city')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t(locale, 'adminPlayers.points')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {t(locale, 'adminPlayers.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {(players || []).map((player) => {
                const isEditing = editingPlayerId === player.id
                const isBusy = busyPlayerIds.includes(player.id)
                const isSelected = selectedPlayerIds.includes(player.id)
                const canDowngrade = isSuperAdmin && player.isTournamentAdmin

                return (
                  <tr
                    key={player.id}
                    className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                      isSelected ? 'bg-amber-50' : ''
                    }`}
                  >
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelection(player.id)}
                          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.displayName || ''}
                          onChange={(e) =>
                            setEditForm((current) => ({
                              ...current,
                              displayName: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-500"
                          disabled={isBusy}
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-900">
                          {player.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.skillLevel || 'CN'}
                          onChange={(e) =>
                            setEditForm((current) => ({
                              ...current,
                              skillLevel: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-500"
                          disabled={isBusy}
                        >
                          {SKILL_LEVEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {t(locale, `skillLevels.${option.value}`)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
                          {t(locale, `skillLevels.${player.skillLevel || 'CN'}`)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.club || ''}
                          onChange={(e) =>
                            setEditForm((current) => ({
                              ...current,
                              club: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-500"
                          disabled={isBusy}
                        />
                      ) : (
                        <span className="text-sm text-slate-600">{player.club || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.city || ''}
                          onChange={(e) =>
                            setEditForm((current) => ({
                              ...current,
                              city: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-500"
                          disabled={isBusy}
                        />
                      ) : (
                        <span className="text-sm text-slate-600">{player.city || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-900">
                        {player.points || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSavePlayer(player.id)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {t(locale, 'adminPlayers.save')}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              <X className="h-3.5 w-3.5" />
                              {t(locale, 'adminPlayers.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditPlayer(player)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              {t(locale, 'adminPlayers.edit')}
                            </button>
                            {canDowngrade && (
                              <button
                                type="button"
                                onClick={() => handleDowngradePlayer(player.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                                {t(locale, 'adminPlayers.downgrade')}
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeletePlayer(player.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                {t(locale, 'adminPlayers.delete')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminPlayersPage
