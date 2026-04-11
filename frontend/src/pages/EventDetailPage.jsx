import { CalendarDays, GitBranch, List, MapPin, Trophy, Users } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import BracketBoard from '../components/BracketBoard'
import EventTabs from '../components/EventTabs'
import MatchResultsList from '../components/MatchResultsList'
import PlayerCard from '../components/PlayerCard'
import RankingLeaderboard from '../components/RankingLeaderboard'
import HeroBanner from '../components/ui/HeroBanner'
import SectionHeader from '../components/ui/SectionHeader'
import { useEventData } from '../hooks/useEventData'
import { useAppStore } from '../store/appStore'
import { tournamentService } from '../services/api'
import { EVENT_TABS, SKILL_LEVEL_OPTIONS } from '../utils/uiConstants'
import { formatCurrency, formatDateRange } from '../utils/formatters'
import { formatKnockoutStartLabel } from '../utils/tournamentLabels'

function EventDetailPage() {
  const { eventId } = useParams()
  const { event, eventMatches, eventPlayers, loading, error } = useEventData(eventId)
  const activeEventTab = useAppStore((state) => state.activeEventTab)
  const setActiveEventTab = useAppStore((state) => state.setActiveEventTab)
  const auth = useAppStore((state) => state.auth)
  const accessToken = auth.accessToken
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState(null)
  const [skillLevel, setSkillLevel] = useState('beginner')
  const [matchView, setMatchView] = useState('list')
  const [matchScope, setMatchScope] = useState('all')

  const handleRegister = async () => {
    if (!accessToken) return

    setRegistering(true)
    setRegisterError(null)
    try {
      await tournamentService.register(eventId, { skillLevel })
      // Refresh the event data or show success
      window.location.reload() // Simple refresh for now
    } catch (error) {
      setRegisterError(error.message || 'Registration failed')
    } finally {
      setRegistering(false)
    }
  }

  const rankedPlayers = eventPlayers.slice().sort((left, right) => left.ranking - right.ranking)
  const resolvePlayerName = (playerId, fallbackName) =>
    eventPlayers.find((player) => player.id === playerId)?.name || fallbackName || 'TBD'
  const isDoubleElimination = event?.rawFormat === 'double_elimination'
  const myPlayerId = auth.user?.playerId || null
  const myMatches = eventMatches.filter((match) => [String(match.player1Id || ''), String(match.player2Id || '')].includes(String(myPlayerId || '')))

  useEffect(() => {
    if (!myPlayerId) {
      setMatchScope('all')
      return
    }

    if (auth.user?.role === 'user' && myMatches.length > 0) {
      setMatchScope('mine')
      return
    }

    setMatchScope('all')
  }, [auth.user?.role, myMatches.length, myPlayerId])

  const visibleMatches = matchScope === 'mine' && myMatches.length ? myMatches : eventMatches

  if (!loading && !event) {
    return <Navigate to="/" replace />
  }

  if (loading || !event) {
    return (
      <section className="page-shell py-20">
        <p className={`text-sm ${error ? 'font-medium text-red-600' : 'text-slate-500'}`}> 
          {error ? error.message : 'Loading event details...'}
        </p>
      </section>
    )
  }

  return (
    <>
      <HeroBanner event={event} compact />

      <section className="page-shell mt-10">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.95fr)]">
            <div>
              <SectionHeader eyebrow="Event Overview" title={event.name} description={event.overview} />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Venue</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-[#EAB308]" />
                    {event.venue}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Dates</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <CalendarDays className="h-4 w-4 text-[#EAB308]" />
                    {formatDateRange(event.startDate, event.endDate)}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Prize Fund</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <Trophy className="h-4 w-4 text-[#EAB308]" />
                    {formatCurrency(event.prizeFund)}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Players</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-[#EAB308]" />
                    {event.currentPlayerCount}/{event.fieldSize} Players
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Event Class</p>
                  <p className="mt-2 font-semibold text-slate-900">{event.eventClassLabel}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Format</p>
                  <p className="mt-2 font-semibold text-slate-900">{event.format}</p>
                  {isDoubleElimination ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">Knockout: {formatKnockoutStartLabel(event.bracketSettings?.knockoutStartSize)}</span>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">Winner + Loser Qualifiers</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {accessToken && event.status === 'open_registration' && (
                <div className="mt-6">
                  <label className="mb-3 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Temporary Skill Level For This Tournament</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                      value={skillLevel}
                      onChange={(event) => setSkillLevel(event.target.value)}
                    >
                      {SKILL_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#0F172A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-50"
                  >
                    {registering ? 'Registering...' : 'Register for Tournament'}
                  </button>
                  {registerError && (
                    <p className="mt-2 text-sm font-medium text-red-600">{registerError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-[1.75rem] bg-[#0F172A] p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#EAB308]">Prize Breakdown</p>
              <div className="mt-6 space-y-3">
                {event.prizeBreakdown.map((item) => (
                  <div key={`${item.label}-${item.payoutCount || 1}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {item.payoutCount || 1} {(item.payoutCount || 1) > 1 ? 'players' : 'player'} - {formatCurrency(item.perPlayerAmount || item.amount || 0)} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total</p>
                        <p className="mt-1 font-bold text-white">{formatCurrency(item.totalAmount || item.amount || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <EventTabs items={EVENT_TABS} activeItem={activeEventTab} onChange={setActiveEventTab} />
          </div>
        </div>
      </section>

      <section className="page-shell mt-8">
        {activeEventTab === 'Info' ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <h3 className="display-title text-3xl text-[#0F172A]">Tournament Notes</h3>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>
                  This event uses a polished tournament presentation with broadcast-style match cards and clear player, ranking, and bracket surfacing.
                </p>
                <p>
                  Players: {event.currentPlayerCount}/{event.fieldSize}, {event.tableCount} competition tables, format: {event.format}.
                </p>
                {isDoubleElimination ? (
                  <p>
                    Double elimination qualifier: winner-side players qualify directly into the knockout bracket, one-loss players can still qualify from the loser side, and a second loss means elimination. Knockout starts from {formatKnockoutStartLabel(event.bracketSettings?.knockoutStartSize)}.
                  </p>
                ) : null}
                {event.tableCount ? (
                  <p>
                    Competition tables: {event.tableCount}
                    {event.tvTableCount ? `, livestream tables: ${event.tvTableCount}` : ''}.
                  </p>
                ) : null}
                <p>
                  This page now reads directly from the real backend API and handles empty database states cleanly.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <h3 className="display-title text-3xl text-[#0F172A]">Key Players</h3>
              <div className="mt-5 space-y-4">
                {rankedPlayers.slice(0, 3).map((player) => (
                  <div key={player.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{player.name}</p>
                      <p className="text-sm text-slate-500">{player.country}</p>
                    </div>
                    <div className="display-title text-3xl text-[#0F172A]">#{player.ranking}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeEventTab === 'Matches' ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {myPlayerId && myMatches.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMatchScope('mine')}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      matchScope === 'mine'
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    My Matches
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchScope('all')}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      matchScope === 'all'
                        ? 'bg-[#0F172A] text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    All Matches
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setMatchView('list')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  matchView === 'list'
                    ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <List className="h-4 w-4" />
                Match List
              </button>
              <button
                type="button"
                onClick={() => setMatchView('bracket')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  matchView === 'bracket'
                    ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <GitBranch className="h-4 w-4" />
                Bracket
              </button>
            </div>

            {matchView === 'list' ? (
              <MatchResultsList matches={visibleMatches} resolvePlayerName={resolvePlayerName} />
            ) : (
              <BracketBoard matches={visibleMatches} resolvePlayerName={resolvePlayerName} />
            )}
          </div>
        ) : null}

        {activeEventTab === 'Ranking' ? (
          <RankingLeaderboard players={rankedPlayers} />
        ) : null}

        {activeEventTab === 'Players' ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {eventPlayers.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        ) : null}
      </section>
    </>
  )
}

export default EventDetailPage






