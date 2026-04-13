import { useCallback, useMemo, useState } from 'react'
import EventCard from '../components/EventCard'
import HeroBanner from '../components/ui/HeroBanner'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function EventsPage() {
  const locale = useAppStore((state) => state.locale)
  const [filters, setFilters] = useState({
    city: '',
    status: '',
    minPrizeFund: '',
    minChampionPrize: '',
  })

  const loader = useCallback(() => tournamentService.list(filters), [filters])
  const { data: tournaments, loading, error } = useAsyncData(loader)

  const sortedTournaments = useMemo(
    () => [...(tournaments || [])].sort(
      (left, right) => new Date(right.createdAt || right.startDate || 0).getTime()
        - new Date(left.createdAt || left.startDate || 0).getTime(),
    ),
    [tournaments],
  )

  const featuredEvent = sortedTournaments[0]

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      {featuredEvent ? <HeroBanner event={featuredEvent} /> : null}

      <section className="page-shell mt-16 pb-10">
        <SectionHeader
          eyebrow={t(locale, 'eventsPage.eyebrow')}
          title={t(locale, 'eventsPage.title')}
          description={t(locale, 'eventsPage.description')}
        />

        <div className="mb-8 grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {t(locale, 'eventsPage.location')}
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="Hanoi"
              value={filters.city}
              onChange={(event) => updateFilter('city', event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {t(locale, 'eventsPage.status')}
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">{t(locale, 'eventsPage.allStatus')}</option>
              <option value="open_registration">{t(locale, 'eventsPage.openRegistration')}</option>
              <option value="ongoing">{t(locale, 'eventsPage.ongoing')}</option>
              <option value="finished">{t(locale, 'eventsPage.finished')}</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {t(locale, 'eventsPage.minimumPrizeFund')}
            </span>
            <input
              type="number"
              min="0"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="10000"
              value={filters.minPrizeFund}
              onChange={(event) => updateFilter('minPrizeFund', event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {t(locale, 'eventsPage.championPrizeAtLeast')}
            </span>
            <input
              type="number"
              min="0"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="3000"
              value={filters.minChampionPrize}
              onChange={(event) => updateFilter('minChampionPrize', event.target.value)}
            />
          </label>
        </div>

        {loading ? <p className="text-sm text-slate-500">{t(locale, 'eventsPage.loading')}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

        {!loading && !error && sortedTournaments.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
            {t(locale, 'eventsPage.empty')}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {sortedTournaments.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </>
  )
}

export default EventsPage