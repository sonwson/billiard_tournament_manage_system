import { Clock3, Dot, Radio, Trophy } from 'lucide-react'
import { formatMatchTime, formatSkillLevel } from '../utils/formatters'
import StatusBadge from './ui/StatusBadge'

function PlayerScoreRow({ player, score, winner, muted }) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
        winner
          ? 'border-[#EAB308]/60 bg-amber-50'
          : muted
            ? 'border-slate-200 bg-slate-50'
            : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0F172A] text-sm font-bold text-white">
          {player?.countryCode || 'PL'}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{player?.name || 'TBD'}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{player?.country || 'Awaiting slot'}</p>
        </div>
      </div>
      <div className="display-title text-4xl text-[#0F172A]">{score}</div>
    </div>
  )
}

function MatchCard({ match, player1, player2 }) {
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'

  return (
    <article className="score-grid-lines overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_22px_65px_-45px_rgba(15,23,42,0.55)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#EAB308]">{match.round}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {formatSkillLevel(match.skillLevel)}
          </p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">{match.table}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            <Clock3 className="h-4 w-4" />
            {formatMatchTime(match.scheduledAt)}
          </div>
          <StatusBadge tone={match.status}>{match.status}</StatusBadge>
        </div>
      </div>

      <div className="space-y-3">
        <PlayerScoreRow
          player={player1}
          score={match.score1}
          winner={isFinished && match.score1 > match.score2}
          muted={!player1}
        />
        <PlayerScoreRow
          player={player2}
          score={match.score2}
          winner={isFinished && match.score2 > match.score1}
          muted={!player2}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          {isLive ? <Radio className="h-4 w-4 text-[#EF4444]" /> : <Dot className="h-4 w-4 text-slate-400" />}
          Race to {match.raceTo}
        </div>
        {isFinished ? (
          <div className="flex items-center gap-2 font-semibold text-emerald-700">
            <Trophy className="h-4 w-4" />
            Final result locked
          </div>
        ) : (
          <p className="font-medium text-slate-500">{isLive ? 'Table update in progress' : 'Awaiting break-off'}</p>
        )}
      </div>
    </article>
  )
}

export default MatchCard
