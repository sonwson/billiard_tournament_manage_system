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
          eyebrow={t(locale, 'Global Calendar', 'Lịch thi đấu')}
          title={t(locale, 'Featured Events', 'Giải đấu nổi bật')}
          description={t(
            locale,
            'Browse upcoming tournaments, live brackets, prize pools, and event status at a glance.',
            'Theo dõi các giải đấu sắp diễn ra, nhánh đấu trực tiếp, quỹ thưởng và trạng thái giải chỉ trong một màn hình.',
          )}
        />

        <div className="mb-8 grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {t(locale, 'Location', 'Địa điểm')}
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
              {t(locale, 'Status', 'Trạng thái')}
            </span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">{t(locale, 'All status', 'Tất cả trạng thái')}</option>
              <option value="open_registration">{t(locale, 'Open Registration', 'Mở đăng ký')}</option>
              <option value="ongoing">{t(locale, 'Ongoing', 'Đang diễn ra')}</option>
              <option value="finished">{t(locale, 'Finished', 'Đã kết thúc')}</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              {t(locale, 'Minimum Prize Fund', 'Quỹ thưởng tối thiểu')}
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
              {t(locale, 'Champion Prize At Least', 'Giải vô địch tối thiểu')}
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

        {loading ? <p className="text-sm text-slate-500">{t(locale, 'Loading tournaments...', 'Đang tải giải đấu...')}</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}

        {!loading && !error && sortedTournaments.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
            {t(locale, 'Currently there is no tournament.', 'Hiện chưa có giải đấu nào.')}
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
