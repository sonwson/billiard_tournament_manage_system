import { GitBranch, List } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import BracketBoard from '../components/BracketBoard'
import MatchResultsList from '../components/MatchResultsList'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchService, playerService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function MatchesPage() {
  const locale = useAppStore((state) => state.locale)
  const matchesLoader = useCallback(() => matchService.list(), [])
  const playersLoader = useCallback(() => playerService.list(), [])
  const { data: matches, loading, error } = useAsyncData(matchesLoader, { refreshMs: 5000 })
  const { data: players } = useAsyncData(playersLoader)
  const [viewMode, setViewMode] = useState('list')

  const safeMatches = useMemo(() => matches || [], [matches])

  const resolvePlayerName = (playerId, fallbackName) =>
    (players || []).find((player) => player.id === playerId)?.name || fallbackName || 'TBD'

  return (
    <section className="page-shell py-10">
      <SectionHeader
        eyebrow={t(locale, 'Live Center', 'Trung tâm trực tiếp')}
        title={t(locale, 'Match Schedule & Scores', 'Lịch thi đấu & Tỉ số')}
        description={t(locale, 'Track every session with clear status color coding, race targets, and high-contrast score presentation.', 'Theo dõi từng lượt đấu với trạng thái rõ ràng, race target và phần hiển thị tỉ số nổi bật.')}
      />

      {loading ? <p className="text-sm text-slate-500">{t(locale, 'Loading matches...', 'Đang tải trận đấu...')}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
            viewMode === 'list'
              ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <List className="h-4 w-4" />
          {t(locale, 'Match List', 'Danh sách trận')}
        </button>
        <button
          type="button"
          onClick={() => setViewMode('bracket')}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
            viewMode === 'bracket'
              ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GitBranch className="h-4 w-4" />
          {t(locale, 'Bracket', 'Nhánh đấu')}
        </button>
      </div>

      {viewMode === 'list' ? (
        <MatchResultsList matches={safeMatches} resolvePlayerName={resolvePlayerName} />
      ) : (
        <BracketBoard matches={safeMatches} resolvePlayerName={resolvePlayerName} />
      )}
    </section>
  )
}

export default MatchesPage
