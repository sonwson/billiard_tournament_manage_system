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
        eyebrow={t(locale, 'rankingsPage.eyebrow')}
        title={t(locale, 'rankingsPage.title')}
        description={t(locale, 'rankingsPage.description')}
      />

      {loading ? <p className="text-sm text-slate-500">{t(locale, 'rankingsPage.loading')}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

      <RankingLeaderboard players={players || []} />
    </section>
  )
}

export default RankingsPage