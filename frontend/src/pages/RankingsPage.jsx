import { RefreshCw, RotateCcw } from 'lucide-react'
import { useCallback, useState } from 'react'
import RankingLeaderboard from '../components/RankingLeaderboard'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { rankingService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function RankingsPage() {
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const pushToast = useAppStore((state) => state.pushToast)
  const [resetting, setResetting] = useState(false)
  const isRankingAdmin = ['admin', 'super_admin', 'tournament_admin'].includes(auth.user?.role)
  const loader = useCallback(() => rankingService.list(), [])
  const { data: players, loading, error, reload } = useAsyncData(loader)

  async function handleResetRankings() {
    if (!window.confirm(t(locale, 'rankingsPage.resetConfirm'))) {
      return
    }

    try {
      setResetting(true)
      await rankingService.reset()
      await reload(false)
      pushToast({
        type: 'success',
        title: t(locale, 'rankingsPage.resetSuccessTitle'),
        message: t(locale, 'rankingsPage.resetSuccessMessage'),
      })
    } catch (caughtError) {
      pushToast({
        type: 'error',
        title: t(locale, 'rankingsPage.resetFailedTitle'),
        message: caughtError.message || t(locale, 'rankingsPage.resetFailedMessage'),
      })
    } finally {
      setResetting(false)
    }
  }

  return (
    <section className="page-shell py-8 sm:py-10">
      <SectionHeader
        eyebrow={t(locale, 'rankingsPage.eyebrow')}
        title={t(locale, 'rankingsPage.title')}
        description={t(locale, 'rankingsPage.description')}
        action={isRankingAdmin ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetRankings}
              disabled={resetting}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? t(locale, 'rankingsPage.resetting') : t(locale, 'rankingsPage.resetAction')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                pushToast({
                  type: 'info',
                  title: t(locale, 'rankingsPage.rollbackInfoTitle'),
                  message: t(locale, 'rankingsPage.rollbackInfoMessage'),
                })
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              title={t(locale, 'rankingsPage.rollbackHint')}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t(locale, 'rankingsPage.rollbackAction')}</span>
            </button>
          </div>
        ) : null}
      />

      {loading ? <p className="text-sm text-slate-500">{t(locale, 'rankingsPage.loading')}</p> : null}
      {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

      <RankingLeaderboard players={players || []} />
    </section>
  )
}

export default RankingsPage