import { useAppStore } from '../store/appStore'
import { formatBracketRound } from '../utils/matchLabels'
import { t } from '../utils/i18n'

function getTableSortValue(tableLabel = '') {
  const value = String(tableLabel || '').trim().toUpperCase()

  if (!value || value === 'TABLE TBC') {
    return { group: 3, order: Number.POSITIVE_INFINITY }
  }

  const tvMatch = value.match(/^TV(\d+)$/)
  if (tvMatch) {
    return { group: 1, order: Number(tvMatch[1]) }
  }

  const tableMatch = value.match(/^T(\d+)$/)
  if (tableMatch) {
    return { group: 2, order: Number(tableMatch[1]) }
  }

  return { group: 3, order: Number.POSITIVE_INFINITY }
}

function compareMatchesByTable(left, right) {
  const leftTable = getTableSortValue(left.rawTableNo || left.table)
  const rightTable = getTableSortValue(right.rawTableNo || right.table)

  if (leftTable.group !== rightTable.group) {
    return leftTable.group - rightTable.group
  }

  if (leftTable.order !== rightTable.order) {
    return leftTable.order - rightTable.order
  }

  const leftTime = left.scheduledAt ? new Date(left.scheduledAt).getTime() : Number.POSITIVE_INFINITY
  const rightTime = right.scheduledAt ? new Date(right.scheduledAt).getTime() : Number.POSITIVE_INFINITY

  if (leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return (left.matchNumber || 0) - (right.matchNumber || 0)
}

function formatBroadcastTime(value, locale) {
  if (!value) return t(locale, 'matchList.tbd')

  return new Date(value).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '') + 'h'
}

function MatchResultsList({ matches = [], resolvePlayerName }) {
  const locale = useAppStore((state) => state.locale)

  const rounds = matches.reduce((accumulator, match) => {
    const resolvedRound = match.roundLabel || match.round || formatBracketRound(match)
    const key = `${match.skillLevel || 'open'}::${resolvedRound}::${match.bracketType || 'main'}::${match.roundNumber || 0}::${match.stage || ''}`
    if (!accumulator[key]) {
      accumulator[key] = []
    }
    accumulator[key].push(match)
    return accumulator
  }, {})

  const entries = Object.entries(rounds)
    .map(([key, items]) => [key, items.slice().sort(compareMatchesByTable)])
    .sort((left, right) => {
      const leftItem = left[1][0] || {}
      const rightItem = right[1][0] || {}
      const leftRound = Number(leftItem.roundNumber || 0)
      const rightRound = Number(rightItem.roundNumber || 0)
      if (leftRound !== rightRound) return leftRound - rightRound
      const leftSkill = String(leftItem.skillLevel || '')
      const rightSkill = String(rightItem.skillLevel || '')
      return leftSkill.localeCompare(rightSkill)
    })

  if (!entries.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {t(locale, 'matchList.empty')}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {entries.map(([key, items]) => {
        const heading = items[0]?.roundLabel || items[0]?.round || formatBracketRound(items[0] || {})
        return (
          <div key={key} className="space-y-2">
            <div className="rounded-[1rem] bg-[#E13342] px-5 py-3 text-sm font-black uppercase italic tracking-[0.06em] text-white shadow-[0_12px_30px_-20px_rgba(225,51,66,0.9)] [font-family:'Roboto_Condensed','Inter',sans-serif]">
              {`${heading} - ${t(locale, 'matchList.raceTo')} ${items[0]?.raceTo || '-'}`}
            </div>

            <div className="space-y-1.5">
              {items.map((match) => {
                const skillSuffix = match.skillLevel ? ` - ${t(locale, `skillLevels.${match.skillLevel}`)}` : ''
                const resolvedPlayer1Name = resolvePlayerName(match.player1Id, match.player1Name)
                const resolvedPlayer2Name = resolvePlayerName(match.player2Id, match.player2Name)
                const player1Name = resolvedPlayer1Name && resolvedPlayer1Name !== t(locale, 'matchList.tbd') ? `${resolvedPlayer1Name}${skillSuffix}` : resolvedPlayer1Name
                const player2Name = resolvedPlayer2Name && resolvedPlayer2Name !== t(locale, 'matchList.tbd') ? `${resolvedPlayer2Name}${skillSuffix}` : resolvedPlayer2Name
                const player1Won = String(match.winnerPlayerId || '') === String(match.player1Id || '')
                const player2Won = String(match.winnerPlayerId || '') === String(match.player2Id || '')
                const isLive = match.status === 'live'
                const isFinished = match.status === 'finished'

                return (
                  <article
                    key={match.id}
                    className="grid overflow-hidden rounded-[0.95rem] border border-[#2B3853] bg-[#1C2740] text-white shadow-[0_20px_30px_-24px_rgba(15,23,42,0.9)] md:grid-cols-[62px_minmax(0,1fr)_152px]"
                  >
                    <div className="flex items-center justify-center bg-[#2B3752] px-3 py-4 text-sm font-black uppercase italic tracking-[0.04em] text-[#71809B] [font-family:'Roboto_Condensed','Inter',sans-serif]">
                      {match.table || t(locale, 'matchList.tbd')}
                    </div>

                    <div className="flex min-w-0 items-center justify-center px-4 py-4">
                      <div className="grid w-full grid-cols-[minmax(0,1fr)_48px_40px_48px_minmax(0,1fr)] items-center gap-2 md:gap-4">
                        <div className={`min-w-0 truncate text-right text-[1.08rem] font-black italic tracking-[0.01em] [font-family:'Roboto_Condensed','Arial_Narrow',sans-serif] ${isFinished ? (player1Won ? 'text-white' : 'text-[#C3CBD9]') : 'text-white'}`}>
                          {player1Name}
                        </div>
                        <div className={`text-center text-[1.9rem] font-black italic leading-none tabular-nums [font-family:'Roboto_Condensed','Inter',sans-serif] ${isFinished && player1Won ? 'text-[#FF4A58]' : 'text-white'}`}>
                          {match.score1}
                        </div>
                        <div className="text-center text-xs uppercase tracking-[0.18em] text-[#7B8AA7]">{t(locale, 'matchList.versus')}</div>
                        <div className={`text-center text-[1.9rem] font-black italic leading-none tabular-nums [font-family:'Roboto_Condensed','Inter',sans-serif] ${isFinished && player2Won ? 'text-[#FF4A58]' : 'text-white'}`}>
                          {match.score2}
                        </div>
                        <div className={`min-w-0 truncate text-left text-[1.08rem] font-black italic tracking-[0.01em] [font-family:'Roboto_Condensed','Arial_Narrow',sans-serif] ${isFinished ? (player2Won ? 'text-white' : 'text-[#C3CBD9]') : 'text-white'}`}>
                          {player2Name}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center border-t border-[#2B3853] bg-[#2B3752] px-4 py-3 text-right md:border-t-0 md:border-l">
                      <span className="text-xs font-medium text-[#8EA0BF]">{formatBroadcastTime(match.scheduledAt, locale)}</span>
                      <span className="mt-1 text-xs font-semibold text-[#7D90AF]">#{match.matchNumber || '-'}</span>
                      <span className={`mt-1 text-[11px] font-bold uppercase tracking-[0.18em] ${isLive ? 'text-[#FF707B]' : 'text-[#8EA0BF]'}`}>
                        {t(locale, 'status.' + match.status)}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default MatchResultsList
