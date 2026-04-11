import { useMemo, useState } from 'react'
import { RANKING_VIEW_OPTIONS } from '../utils/uiConstants'
import RankingCard from './RankingCard'

function RankingLeaderboard({ players = [], initialMetric = 'points' }) {
  const [metric, setMetric] = useState(initialMetric)
  const sortedPlayers = useMemo(
    () => players.slice().sort((left, right) => {
      const valueRight = metric === 'prizeMoney' ? right.prizeMoney || 0 : right.points || 0
      const valueLeft = metric === 'prizeMoney' ? left.prizeMoney || 0 : left.points || 0

      if (valueRight !== valueLeft) {
        return valueRight - valueLeft
      }

      return (left.ranking || 9999) - (right.ranking || 9999)
    }),
    [metric, players],
  )
  const featuredPlayers = sortedPlayers.slice(0, 5)
  const remainingPlayers = sortedPlayers.slice(5)

  if (!sortedPlayers.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No ranking data available yet.
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {RANKING_VIEW_OPTIONS.map((option) => {
          const active = option.value === metric

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setMetric(option.value)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                active
                  ? 'border border-slate-200 bg-slate-100 text-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {featuredPlayers.length ? (
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_26px_75px_-48px_rgba(15,23,42,0.48)]">
          <div className="h-18 bg-[linear-gradient(120deg,rgba(15,23,42,0.96),rgba(20,33,61,0.92)),linear-gradient(90deg,rgba(234,179,8,0.18),transparent)]" />

          <div className="space-y-1 bg-gradient-to-b from-white via-white to-slate-50/70 p-3 sm:p-4">
            {featuredPlayers.map((player, index) => (
              <RankingCard
                key={player.id}
                player={player}
                highlight={index === 0}
                grouped
                metric={metric}
                displayRank={index + 1}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {remainingPlayers.map((player, index) => (
          <RankingCard key={player.id} player={player} metric={metric} displayRank={index + 6} />
        ))}
      </div>
    </>
  )
}

export default RankingLeaderboard
