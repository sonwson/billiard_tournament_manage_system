import { useAppStore } from '../../store/appStore'
import { t } from '../../utils/i18n'

function PlayerStatsTable({ stats }) {
  const locale = useAppStore((state) => state.locale)
  const players = Array.isArray(stats) ? stats : []

  if (!players.length) {
    return null
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-bold text-slate-900">{t(locale, 'playerStats.title')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-3 py-3 text-left font-semibold text-slate-600">{t(locale, 'playerStats.rank')}</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">{t(locale, 'playerStats.player')}</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-600">{t(locale, 'playerStats.matchesPlayed')}</th>
              <th className="px-3 py-3 text-center font-semibold text-emerald-600">{t(locale, 'playerStats.wins')}</th>
              <th className="px-3 py-3 text-center font-semibold text-rose-600">{t(locale, 'playerStats.losses')}</th>
              <th className="px-3 py-3 text-center font-bold text-slate-900">{t(locale, 'playerStats.points')}</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-600">{t(locale, 'playerStats.racesWon')}</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-600">{t(locale, 'playerStats.racesLost')}</th>
              <th className="px-3 py-3 text-center font-bold text-amber-600">{t(locale, 'playerStats.raceDiff')}</th>
            </tr>
          </thead>
                    <tbody>
            {players.map((player, index) => {
              const resolvedPlayer = player.player || player.playerId || null
              const playerName =
                resolvedPlayer?.displayName
                || resolvedPlayer?.name
                || player.snapshot?.displayName
                || resolvedPlayer?.playerCode
                || 'Unknown'

              return (
                <tr
                  key={player.playerId}
                  className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                >
                  <td className="px-3 py-3 font-bold text-slate-900">#{player.rank}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">
                      {playerName}
                    </div>
                    {resolvedPlayer?.club ? (
                      <div className="text-xs text-slate-500">{resolvedPlayer.club}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">{player.matchesPlayed}</td>
                  <td className="px-3 py-3 text-center font-semibold text-emerald-600">{player.wins}</td>
                  <td className="px-3 py-3 text-center font-semibold text-rose-600">{player.losses}</td>
                  <td className="px-3 py-3 text-center font-bold text-slate-900">{player.points}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{player.racesWon}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{player.racesLost}</td>
                  <td className="px-3 py-3 text-center font-bold text-amber-600">{player.raceDiff}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PlayerStatsTable
