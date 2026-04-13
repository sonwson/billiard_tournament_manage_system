import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { stripDiacritics } from '../utils/text'

function RankingCard({ player, highlight = false, grouped = false, metric = 'points', displayRank }) {
  const avatarSize = highlight ? 'h-12 w-12 sm:h-16 sm:w-16' : grouped ? 'h-10 w-10 sm:h-12 sm:w-12' : 'h-9 w-9 sm:h-10 sm:w-10'
  const wrapperClass = grouped
    ? `rounded-[1rem] px-3 py-3.5 transition sm:rounded-[1.25rem] sm:px-6 sm:py-4 ${highlight ? 'bg-white' : 'bg-transparent'}`
    : 'rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3.5 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.5)] sm:rounded-[1.5rem] sm:px-5 sm:py-4'
  const displayValue =
    metric === 'prizeMoney'
      ? formatCurrency(player.prizeMoney || 0)
      : `${player.points || 0} pts`
  const displayName = stripDiacritics(player.name)

  const rankLabel = displayRank || player.ranking

  return (
    <article className={wrapperClass}>
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
          <div className={`leaderboard-rank shrink-0 leading-none text-[#0F172A] ${highlight ? 'text-4xl sm:text-5xl' : grouped ? 'text-3xl' : 'text-2xl'}`}>
            #{rankLabel}
          </div>

          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className={`${avatarSize} shrink-0 rounded-2xl object-cover`}
            />
          ) : (
            <div
              className={`grid ${avatarSize} shrink-0 place-items-center rounded-2xl bg-[#0F172A] font-bold text-white ${
                highlight ? 'text-xl sm:text-2xl' : grouped ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              }`}
            >
              {player.name.slice(0, 1)}
            </div>
          )}

          <div className="min-w-0">
            <h3
              className={`leaderboard-name truncate leading-[0.96] text-[#14213D] ${
                highlight ? 'text-[1.45rem] sm:text-[2rem]' : grouped ? 'text-[1.12rem] sm:text-[1.6rem]' : 'text-[1rem] sm:text-[1.25rem]'
              }`}
            >
              {displayName}
            </h3>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pl-1 text-right sm:gap-2 sm:pl-2">
          <TrendingUp className={`${highlight ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'} text-[#EAB308]`} />
          <div
            className={`leaderboard-value text-[#7C94C7] ${
              highlight ? 'text-[2rem] sm:text-[3.4rem]' : grouped ? 'text-[1.5rem] sm:text-[2.35rem]' : 'text-[1.25rem] sm:text-[1.85rem]'
            }`}
          >
            {displayValue}
          </div>
        </div>
      </div>
    </article>
  )
}

export default RankingCard
