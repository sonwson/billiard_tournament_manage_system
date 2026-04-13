import { Check, Globe2 } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function PlayerCard({ player, selectable = false, selected = false, onSelectToggle }) {
  const locale = useAppStore((state) => state.locale)

  return (
    <article
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={selectable ? () => onSelectToggle?.(player.id) : undefined}
      onKeyDown={
        selectable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectToggle?.(player.id)
              }
            }
          : undefined
      }
      className={`overflow-hidden rounded-[1.75rem] border bg-white p-5 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.55)] transition hover:-translate-y-1 ${
        selected ? 'border-[#EAB308] ring-2 ring-amber-200' : 'border-slate-200'
      } ${selectable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2' : ''}`}
    >
      {selectable ? (
        <div className="mb-4 flex justify-end">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] transition ${
              selected
                ? 'border-[#EAB308] bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {selected ? <Check className="h-3.5 w-3.5" /> : null}
            {selected ? t(locale, 'playersPage.selected') : t(locale, 'playersPage.select')}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="h-18 w-18 h-20 w-20 rounded-3xl object-cover" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#14213D] text-2xl font-bold text-white">
            {player.name.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="text-xl font-bold text-slate-900">{player.name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <Globe2 className="h-4 w-4 text-[#EAB308]" />
            {player.country}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t(locale, 'playersPage.points')}</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{player.points}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{t(locale, 'playersPage.earnings')}</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatCurrency(player.prizeMoney)}</p>
        </div>
      </div>
    </article>
  )
}

export default PlayerCard