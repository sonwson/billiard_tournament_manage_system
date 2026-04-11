import { useCallback, useState } from 'react'
import PlayerCard from '../components/PlayerCard'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { playerService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function PlayersPage() {
  const loader = useCallback(() => playerService.list({ participated: true, limit: 500 }), [])
  const { data: players, loading, error, setData } = useAsyncData(loader)
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const [busyPlayerIds, setBusyPlayerIds] = useState([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [actionError, setActionError] = useState('')
  const isSuperAdmin = ['admin', 'super_admin'].includes(auth.user?.role)
  const selectedPlayers = (players || []).filter((item) => selectedPlayerIds.includes(item.id))

  function handleTogglePlayerSelection(playerId) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    )
  }

  function handleSelectAllPlayers() {
    setSelectedPlayerIds((players || []).map((player) => player.id))
  }

  async function handleDeleteSelectedPlayers() {
    if (!selectedPlayers.length) {
      return
    }

    setActionError('')

    try {
      const confirmed = window.confirm(
        t(
          locale,
          `Delete ${selectedPlayers.length} selected player${selectedPlayers.length > 1 ? 's' : ''} permanently?`,
          `Xóa vĩnh viễn ${selectedPlayers.length} cơ thủ đã chọn?`,
        ),
      )

      if (!confirmed) {
        return
      }

      setBusyPlayerIds(selectedPlayerIds)
      await Promise.all(selectedPlayerIds.map((playerId) => playerService.remove(playerId)))
      setData((current) => (current || []).filter((item) => !selectedPlayerIds.includes(item.id)))
      setSelectedPlayerIds([])
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to delete selected players')
    } finally {
      setBusyPlayerIds([])
    }
  }

  return (
    <section className="page-shell py-10">
      <SectionHeader
        eyebrow={t(locale, 'Player Directory', 'Danh sách cơ thủ')}
        title={t(locale, 'Player Profiles', 'Hồ sơ cơ thủ')}
        description={t(locale, 'A flexible player grid ready for real avatars, nationality flags, ranking points, and future profile drill-downs.', 'Lưới cơ thủ linh hoạt, sẵn sàng cho avatar thật, quốc tịch, điểm xếp hạng và trang hồ sơ chi tiết về sau.')}
      />

      {loading ? <p className="text-sm text-slate-500">{t(locale, 'Loading players...', 'Đang tải cơ thủ...')}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}
      {actionError ? <p className="text-sm font-medium text-red-600">{actionError}</p> : null}

      {isSuperAdmin ? (
        <div className="mb-6 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Bulk Actions</p>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {selectedPlayerIds.length
                ? t(locale, `${selectedPlayerIds.length} player${selectedPlayerIds.length > 1 ? 's' : ''} selected`, `Đã chọn ${selectedPlayerIds.length} cơ thủ`)
                : t(locale, 'Click directly on player cards to select them for bulk delete.', 'Bấm trực tiếp vào thẻ cơ thủ để chọn xóa hàng loạt.')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!players?.length || selectedPlayerIds.length === players.length}
              onClick={handleSelectAllPlayers}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
            >
              {t(locale, 'Select All', 'Chọn tất cả')}
            </button>

            <button
              type="button"
              disabled={!selectedPlayerIds.length}
              onClick={() => setSelectedPlayerIds([])}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
            >
              {t(locale, 'Clear Selection', 'Bỏ chọn')}
            </button>

            <button
              type="button"
              disabled={!selectedPlayerIds.length || busyPlayerIds.length > 0}
              onClick={handleDeleteSelectedPlayers}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
            >
              {busyPlayerIds.length > 0
                ? t(locale, 'Deleting...', 'Đang xóa...')
                : t(locale, `Delete Selected${selectedPlayerIds.length ? ` (${selectedPlayerIds.length})` : ''}`, `Xóa mục đã chọn${selectedPlayerIds.length ? ` (${selectedPlayerIds.length})` : ''}`)}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {(players || []).map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            selectable={isSuperAdmin}
            selected={selectedPlayerIds.includes(player.id)}
            onSelectToggle={handleTogglePlayerSelection}
          />
        ))}
      </div>
    </section>
  )
}

export default PlayersPage
