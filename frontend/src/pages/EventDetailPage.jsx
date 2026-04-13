import { CalendarDays, GitBranch, List, MapPin, Trophy, Users } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import BracketBoard from '../components/BracketBoard'
import EventTabs from '../components/EventTabs'
import MatchResultsList from '../components/MatchResultsList'
import PlayerCard from '../components/PlayerCard'
import RankingLeaderboard from '../components/RankingLeaderboard'
import HeroBanner from '../components/ui/HeroBanner'
import SectionHeader from '../components/ui/SectionHeader'
import { useEventData } from '../hooks/useEventData'
import { tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { EVENT_TABS, SKILL_LEVEL_OPTIONS } from '../utils/uiConstants'
import { formatCurrency, formatDateRange } from '../utils/formatters'
import { t } from '../utils/i18n'
import { formatKnockoutStartLabel } from '../utils/tournamentLabels'

function EventDetailPage() {
  const { eventId } = useParams()
  const { event, eventMatches, eventPlayers, loading, error } = useEventData(eventId)
  const activeEventTab = useAppStore((state) => state.activeEventTab)
  const setActiveEventTab = useAppStore((state) => state.setActiveEventTab)
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const accessToken = auth.accessToken
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState(null)
  const [skillLevel, setSkillLevel] = useState('CN')
  const [matchView, setMatchView] = useState('list')
  const [matchScope, setMatchScope] = useState('all')

  const handleRegister = async () => {
    if (!accessToken) return

    setRegistering(true)
    setRegisterError(null)
    try {
      await tournamentService.register(eventId, { skillLevel })
      window.location.reload()
    } catch (caughtError) {
      setRegisterError(caughtError.message || t(locale, 'eventDetail.registrationFailed'))
    } finally {
      setRegistering(false)
    }
  }

  const rankedPlayers = eventPlayers.slice().sort((left, right) => left.ranking - right.ranking)
  const resolvePlayerName = (playerId, fallbackName) =>
    eventPlayers.find((player) => player.id === playerId)?.name || fallbackName || t(locale, 'matchList.tbd')
  const isDoubleElimination = event?.rawFormat === 'double_elimination'
  const myPlayerId = auth.user?.playerId || null
  const myMatches = eventMatches.filter((match) => [String(match.player1Id || ''), String(match.player2Id || '')].includes(String(myPlayerId || '')))

  const eventClassLabel = useMemo(() => {
    if (!event) return ''
    return [
      event.eventType ? t(locale, `tournamentForm.options.eventTypes.${event.eventType}`) : '',
      event.tier ? t(locale, `tournamentForm.options.tiers.${event.tier}`) : '',
    ].filter(Boolean).join(' ')
  }, [event, locale])

  const eventFormatLabel = useMemo(() => {
    if (!event) return ''
    return event.rawFormat ? t(locale, `tournamentForm.options.formats.${event.rawFormat}`) : event.format
  }, [event, locale])

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
          {error ? error.message : t(locale, 'eventDetail.loading')}
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
              <SectionHeader eyebrow={t(locale, 'eventDetail.overview')} title={event.name} description={event.overview} />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t(locale, 'eventDetail.venue')}</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-[#EAB308]" />
                    {event.venue}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t(locale, 'eventDetail.dates')}</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <CalendarDays className="h-4 w-4 text-[#EAB308]" />
                    {formatDateRange(event.startDate, event.endDate)}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t(locale, 'eventDetail.prizeFund')}</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <Trophy className="h-4 w-4 text-[#EAB308]" />
                    {formatCurrency(event.prizeFund)}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t(locale, 'eventDetail.players')}</p>
                  <p className="mt-2 flex items-center gap-2 font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-[#EAB308]" />
                    {event.currentPlayerCount}/{event.fieldSize} {t(locale, 'eventDetail.players')}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t(locale, 'eventDetail.eventClass')}</p>
                  <p className="mt-2 font-semibold text-slate-900">{eventClassLabel}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4 lg:col-span-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t(locale, 'eventDetail.format')}</p>
                  <p className="mt-2 font-semibold text-slate-900">{eventFormatLabel}</p>
                  {isDoubleElimination ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">{t(locale, 'eventDetail.knockout')}: {formatKnockoutStartLabel(event.bracketSettings?.knockoutStartSize)}</span>
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">{t(locale, 'eventDetail.winnerLoserQualifiers')}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {accessToken && event.status === 'open_registration' ? (
                <div className="mt-6">
                  <label className="mb-3 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">{t(locale, 'eventDetail.temporarySkillLevel')}</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium text-slate-700"
                      value={skillLevel}
                      onChange={(eventOption) => setSkillLevel(eventOption.target.value)}
                    >
                      {SKILL_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(locale, `skillLevels.${option.value}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#0F172A] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-50"
                  >
                    {registering ? t(locale, 'eventDetail.registering') : t(locale, 'eventDetail.registerForTournament')}
                  </button>
                  {registerError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{registerError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] bg-[#0F172A] p-6 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#EAB308]">{t(locale, 'eventDetail.prizeBreakdown')}</p>
              <div className="mt-6 space-y-3">
                {event.prizeBreakdown.map((item) => {
                  const payoutCount = item.payoutCount || 1
                  const playerLabel = payoutCount > 1 ? t(locale, 'eventDetail.multiplePlayers') : t(locale, 'eventDetail.singlePlayer')
                  return (
                    <div key={`${item.label}-${item.payoutCount || 1}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{item.label}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {t(locale, 'eventDetail.playerEach', {
                              count: payoutCount,
                              label: playerLabel,
                              amount: formatCurrency(item.perPlayerAmount || item.amount || 0),
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t(locale, 'eventDetail.total')}</p>
                          <p className="mt-1 font-bold text-white">{formatCurrency(item.totalAmount || item.amount || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
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
              <h3 className="display-title text-3xl text-[#0F172A]">{t(locale, 'eventDetail.tournamentNotes')}</h3>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
                <p>{t(locale, 'eventDetail.notesIntro')}</p>
                <p>
                  {t(locale, 'eventDetail.notesPlayers', {
                    current: event.currentPlayerCount,
                    total: event.fieldSize,
                    tables: event.tableCount,
                    format: eventFormatLabel,
                  })}
                </p>
                {isDoubleElimination ? (
                  <p>
                    {t(locale, 'eventDetail.notesDoubleElimination', {
                      label: formatKnockoutStartLabel(event.bracketSettings?.knockoutStartSize),
                    })}
                  </p>
                ) : null}
                {event.tableCount ? (
                  <p>
                    {t(locale, 'eventDetail.notesTables', {
                      tables: event.tableCount,
                      tvPart: event.tvTableCount ? t(locale, 'eventDetail.notesTvPart', { count: event.tvTableCount }) : '',
                    })}
                  </p>
                ) : null}
                <p>{t(locale, 'eventDetail.notesApi')}</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <h3 className="display-title text-3xl text-[#0F172A]">{t(locale, 'eventDetail.keyPlayers')}</h3>
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
                    {t(locale, 'eventDetail.myMatches')}
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
                    {t(locale, 'eventDetail.allMatches')}
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
                {t(locale, 'eventDetail.matchList')}
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
                {t(locale, 'eventDetail.bracket')}
              </button>
            </div>

            {matchView === 'list' ? (
              <MatchResultsList matches={visibleMatches} resolvePlayerName={resolvePlayerName} />
            ) : (
              <BracketBoard matches={visibleMatches} resolvePlayerName={resolvePlayerName} />
            )}
          </div>
        ) : null}

        {activeEventTab === 'Ranking' ? <RankingLeaderboard players={rankedPlayers} /> : null}

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
