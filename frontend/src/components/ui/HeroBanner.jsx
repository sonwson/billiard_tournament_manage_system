import { ArrowRight, MapPin, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { formatCurrency, formatDateRange } from '../../utils/formatters'
import { t } from '../../utils/i18n'
import StatusBadge from './StatusBadge'

function HeroBanner({ event, compact = false }) {
  const locale = useAppStore((state) => state.locale)

  return (
    <section className="page-shell pt-8 sm:pt-10">
      <div
        className={`relative overflow-hidden rounded-[2rem] border border-white/40 ${
          compact ? 'min-h-[420px]' : 'min-h-[540px]'
        }`}
      >
        <img src={event.image} alt={event.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#14213D]/80 to-[#14213D]/25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,179,8,0.35),transparent_30%)]" />

        <div className="relative flex min-h-[inherit] flex-col justify-end p-6 sm:p-10 lg:p-14">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap gap-3">
              {event.badges.map((badge) => (
                <StatusBadge
                  key={badge}
                  tone={badge.toLowerCase().includes('live') ? 'live' : badge.toLowerCase().includes('ranking') ? 'ranking' : 'open'}
                >
                  {badge}
                </StatusBadge>
              ))}
            </div>

            <p className="mb-3 text-sm font-bold uppercase tracking-[0.35em] text-[#EAB308]">
              {event.heroTitle}
            </p>
            <h1 className="display-title text-5xl leading-none text-white sm:text-6xl lg:text-8xl">
              {event.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              {event.subtitle}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/18 bg-[#0F172A]/52 p-4 text-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.9)] backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300/90">{t(locale, 'heroBanner.location')}</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <MapPin className="h-4 w-4 text-[#EAB308]" />
                  {event.location}
                </p>
              </div>
              <div className="rounded-3xl border border-white/18 bg-[#14213D]/58 p-4 text-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.9)] backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300/90">{t(locale, 'heroBanner.dates')}</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatDateRange(event.startDate, event.endDate)}</p>
              </div>
              <div className="rounded-3xl border border-[#EAB308]/28 bg-[linear-gradient(135deg,rgba(20,33,61,0.78),rgba(15,23,42,0.58))] p-4 text-white shadow-[0_20px_50px_-30px_rgba(234,179,8,0.45)] backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#F8E7A1]">{t(locale, 'heroBanner.prizeFund')}</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
                  <Trophy className="h-4 w-4 text-[#EAB308]" />
                  {formatCurrency(event.prizeFund)}
                </p>
              </div>
            </div>

            {!compact ? (
              <Link
                to={`/events/${event.id}`}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#EAB308] px-6 py-3 text-sm font-bold text-[#0F172A] transition hover:bg-[#f3c623]"
              >
                {t(locale, 'heroBanner.viewEventDetails')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroBanner
