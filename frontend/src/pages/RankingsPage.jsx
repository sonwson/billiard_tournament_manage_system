import { useCallback } from 'react'
import RankingLeaderboard from '../components/RankingLeaderboard'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { rankingService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function RankingsPage() {
  const locale = useAppStore((state) => state.locale)
  const loader = useCallback(() => rankingService.list(), [])
  const { data: players, loading, error } = useAsyncData(loader)

  return (
    <section className="page-shell py-10">
      <SectionHeader
        eyebrow={t(locale, 'Race To The Top', 'Cuộc đua dẫn đầu')}
        title={t(locale, 'Player Rankings', 'Bảng xếp hạng cơ thủ')}
        description={t(locale, 'A broadcast-style leaderboard with a dominant top section and compact rows for the chasing pack.', 'Bảng xếp hạng phong cách broadcast với nhóm dẫn đầu nổi bật và các hàng phía dưới gọn, dễ theo dõi.')}
      />

      {loading ? <p className="text-sm text-slate-500">{t(locale, 'Loading rankings...', 'Đang tải bảng xếp hạng...')}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

      <RankingLeaderboard players={players || []} />
    </section>
  )
}

export default RankingsPage
