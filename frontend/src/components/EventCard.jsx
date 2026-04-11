import { CalendarDays, MapPin, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { formatCurrency, formatDateRange } from '../utils/formatters'
import { t } from '../utils/i18n'
import StatusBadge from './ui/StatusBadge'

function EventCard({ event }) {
  const locale = useAppStore((state) => state.locale)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_65px_-45px_rgba(15,23,42,0.65)] transition duration-300 hover:-translate-y-1 hover:border-[#EAB308]/45 hover:shadow-[0_28px_75px_-35px_rgba(20,33,61,0.35)]">
      <div className="relative h-52 overflow-hidden sm:h-56">
        <img
          src={event.image}
          alt={event.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/65 via-[#0F172A]/18 to-transparent" />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {event.badges.map((badge) => (
            <StatusBadge
              key={badge}
              tone={badge.toLowerCase().includes('live') ? 'live' : badge.toLowerCase().includes('ranking') ? 'ranking' : 'open'}
            >
              {badge}
            </StatusBadge>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-10">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#14213D] shadow-sm backdrop-blur">
              {event.eventClassLabel}
            </div>
            <div className="inline-flex rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#14213D] shadow-sm backdrop-blur">
              {event.format}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="min-h-[7.5rem]">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#EAB308]">{event.venue}</p>
          <h3 className="display-title mt-3 line-clamp-2 text-[2rem] leading-[0.95] text-[#0F172A] sm:text-[2.15rem]">
            {event.name}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500 transition duration-300 group-hover:text-slate-600">
            {event.overview}
          </p>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-slate-600">
          <p className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 text-[#EAB308]" />
            <span className="truncate">{event.location}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#EAB308]" />
            <span>{formatDateRange(event.startDate, event.endDate)}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <Trophy className="h-4 w-4 text-[#EAB308]" />
            <span>{t(locale, 'Prize Fund', 'Quỹ thưởng')} {formatCurrency(event.prizeFund)}</span>
          </p>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            {t(locale, 'Players', 'Cơ thủ')} {event.currentPlayerCount || event.approvedPlayerCount}/{event.fieldSize}
          </p>
        </div>

        <Link
          to={`/events/${event.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 transition hover:border-[#EAB308]/40 hover:bg-[#FFF7D6]"
        >
          {t(locale, 'Explore Event', 'Xem giải đấu')}
        </Link>
      </div>
    </article>
  )
}

export default EventCard
