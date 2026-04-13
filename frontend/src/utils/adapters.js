import { formatEventClass, formatEventType, formatTournamentFormat, formatTournamentTier } from './tournamentLabels'
import { formatBracketRound } from './matchLabels'

function toIsoDate(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

export function normalizeTournament(rawTournament) {
  if (!rawTournament) return null

  const id = rawTournament.id || rawTournament._id
  const prizeFund =
    rawTournament.prizeFund ??
    rawTournament.prizeStructure?.reduce((sum, item) => sum + (item.amount || 0), 0) ??
    0

  const location =
    rawTournament.location ||
    [rawTournament.venue?.city, rawTournament.venue?.address].filter(Boolean).join(', ') ||
    rawTournament.venue?.city ||
    'TBD'
  const rawBracketSettings = rawTournament.bracketSettings || {}
  const normalizedBracketSettings = {
    knockoutStartSize: rawBracketSettings.knockoutStartSize || rawBracketSettings.drawSize || null,
  }
  const eventType = rawTournament.eventType || 'ranking'
  const tier = rawTournament.tier || 'local'

  const badges = []
  if (rawTournament.status === 'ongoing') badges.push('Live')
  if (rawTournament.status === 'open_registration') badges.push('Open')
  badges.push(formatEventClass(eventType, tier))
  if (badges.length === 0 && rawTournament.status) badges.push(rawTournament.status.replaceAll('_', ' '))

  return {
    id,
    name: rawTournament.name,
    location,
    locationCity: rawTournament.venue?.city || '',
    venue: rawTournament.venue?.name || rawTournament.venue || 'Main Arena',
    venueName: rawTournament.venue?.name || '',
    venueAddress: rawTournament.venue?.address || '',
    startDate: toIsoDate(rawTournament.startAt || rawTournament.startDate),
    endDate: toIsoDate(rawTournament.endAt || rawTournament.endDate || rawTournament.startAt),
    prizeFund,
    heroTitle: rawTournament.heroTitle || 'Championship focus. Broadcast energy.',
    subtitle:
      rawTournament.subtitle ||
      rawTournament.description ||
      'Live scoring, player stories, and tournament management built for international cue sport presentation.',
    image:
      rawTournament.image ||
      '/images/default-tournament-poster.jpg',
    badges,
    status:
      rawTournament.status === 'ongoing'
        ? 'live'
        : rawTournament.status === 'finished'
          ? 'finished'
          : rawTournament.status || 'scheduled',
    format: formatTournamentFormat(rawTournament.format),
    rawFormat: rawTournament.format || 'single_elimination',
    eventType,
    eventTypeLabel: formatEventType(eventType),
    gameType: rawTournament.gameType || 'pool_9',
    entryFee: rawTournament.entryFee || 0,
    tableCount: rawTournament.tableCount || 0,
    tvTableCount: rawTournament.tvTableCount || 0,
    fieldSize: rawTournament.maxPlayers || rawTournament.fieldSize || 32,
    prizeBreakdown:
      (rawTournament.prizeBreakdown || rawTournament.prizeStructure || [
        { label: 'Champion', amount: 0, payoutCount: 1 },
        { label: 'Runner-up', amount: 0, payoutCount: 1 },
      ]).map((item) => {
        const payoutCount = Number(item.payoutCount || 1)
        const totalAmount = Number(item.totalAmount ?? item.amount ?? 0)
        const perPlayerAmount = payoutCount > 0 ? totalAmount / payoutCount : totalAmount

        return {
          ...item,
          payoutCount,
          amount: totalAmount,
          totalAmount,
          perPlayerAmount,
        }
      }),
    raceToRules: rawTournament.raceToRules || [],
    bracketSettings: normalizedBracketSettings,
    overview:
      rawTournament.overview ||
      rawTournament.description ||
      'Tournament detail and operations panel.',
    approvedPlayerCount: rawTournament.approvedPlayerCount || 0,
    currentPlayerCount: rawTournament.currentPlayerCount || rawTournament.approvedPlayerCount || 0,
    registrationOpenAt: toIsoDate(rawTournament.registrationOpenAt),
    registrationCloseAt: toIsoDate(rawTournament.registrationCloseAt),
    bracketGeneratedAt: toIsoDate(rawTournament.bracketGeneratedAt),
    createdAt: toIsoDate(rawTournament.createdAt || rawTournament.startAt),
    updatedAt: toIsoDate(rawTournament.updatedAt),
    deletedAt: toIsoDate(rawTournament.deletedAt),
    tier,
    tierLabel: formatTournamentTier(tier),
    eventClassLabel: formatEventClass(eventType, tier),
    rawStatus: rawTournament.rawStatus || rawTournament.status,
  }
}

export function normalizePlayer(rawPlayer, index = 0) {
  if (!rawPlayer) return null

  const source = rawPlayer.playerId || rawPlayer
  const id = source.id || source._id
  const name = source.name || source.displayName || 'Unknown Player'
  const points = rawPlayer.points || rawPlayer.totalPoints || source.stats?.rankingPoints || 0
  const prizeMoney = rawPlayer.prizeMoney || rawPlayer.totalPrizeMoney || source.stats?.totalPrizeMoney || 0

  return {
    id,
    name,
    country: rawPlayer.country || source.city || 'International',
    countryCode: rawPlayer.countryCode || 'INT',
    avatar: source.avatarUrl || rawPlayer.avatar || '',
    email: source.email || rawPlayer.email || '',
    phone: source.phone || rawPlayer.phone || '',
    ranking: rawPlayer.ranking || rawPlayer.currentRank || index + 1,
    points,
    prizeMoney,
    wins: rawPlayer.wins || rawPlayer.matchesWon || source.stats?.matchesWon || 0,
    titles: rawPlayer.titles || rawPlayer.championships || source.stats?.championships || 0,
    skillLevel: rawPlayer.skillLevel || rawPlayer.snapshot?.skillLevel || source.skillLevel || null,
  }
}

export function normalizeRegistration(rawRegistration) {
  if (!rawRegistration) return null

  const player = rawRegistration.playerId || {}
  const user = rawRegistration.userId || {}

  return {
    id: rawRegistration._id || rawRegistration.id,
    tournamentId: rawRegistration.tournamentId,
    status: rawRegistration.status || 'pending',
    reviewedAt: toIsoDate(rawRegistration.reviewedAt),
    registeredAt: toIsoDate(rawRegistration.registeredAt || rawRegistration.createdAt),
    rejectionReason: rawRegistration.rejectionReason || '',
    seedingNumber: rawRegistration.seedingNumber || null,
    skillLevel: rawRegistration.skillLevel || null,
    player: {
      id: player._id || player.id || null,
      name: player.displayName || rawRegistration.snapshot?.displayName || 'Unknown Player',
      club: player.club || rawRegistration.snapshot?.club || 'Independent',
      city: player.city || 'International',
      avatar: player.avatarUrl || '',
      rankingPoints: player.stats?.rankingPoints ?? rawRegistration.snapshot?.rankingPoints ?? 0,
    },
    user: {
      id: user._id || user.id || null,
      name: user.fullName || 'Unknown User',
      email: user.email || '',
      phone: user.phone || '',
    },
  }
}

export function normalizeMatch(rawMatch) {
  if (!rawMatch) return null

  const statusMap = {
    ready: 'scheduled',
    ongoing: 'live',
    completed: 'finished',
  }

  const player1Obj = rawMatch.player1Id || {}
  const player2Obj = rawMatch.player2Id || {}

  return {
    id: rawMatch.id || rawMatch._id,
    eventId: rawMatch.eventId || rawMatch.tournamentId,
    roundNumber: rawMatch.roundNumber || null,
    round: rawMatch.round || formatBracketRound(rawMatch),
    roundLabel: rawMatch.roundLabel || formatBracketRound(rawMatch),
    bracketType: rawMatch.bracketType || 'main',
    skillLevel: Object.prototype.hasOwnProperty.call(rawMatch || {}, 'skillLevel') ? rawMatch.skillLevel : null,
    bracketLabel: rawMatch.bracketLabel || 'Open',
    matchNumber: rawMatch.matchNumber || null,
    table: rawMatch.table || rawMatch.tableNo || 'Table TBC',
    rawTableNo: rawMatch.tableNo || rawMatch.table || null,
    status: statusMap[rawMatch.status] || rawMatch.status || 'scheduled',
    rawStatus: rawMatch.status || 'scheduled',
    scheduledAt: toIsoDate(rawMatch.scheduledAt) || new Date().toISOString(),
    player1Id: player1Obj._id || player1Obj.id || rawMatch.player1Id,
    player2Id: player2Obj._id || player2Obj.id || rawMatch.player2Id,
    player1Name: player1Obj.displayName || rawMatch.player1Name || 'TBD',
    player2Name: player2Obj.displayName || rawMatch.player2Name || 'TBD',
    player1SkillLevel: player1Obj.skillLevel || null,
    player2SkillLevel: player2Obj.skillLevel || null,
    winnerPlayerId: rawMatch.winnerPlayerId?._id || rawMatch.winnerPlayerId || null,
    nextMatchId: rawMatch.nextMatchId?._id || rawMatch.nextMatchId || null,
    loserNextMatchId: rawMatch.loserNextMatchId?._id || rawMatch.loserNextMatchId || null,
    stage: rawMatch.stage || '',
    score1: rawMatch.score1 ?? rawMatch.player1Score ?? 0,
    score2: rawMatch.score2 ?? rawMatch.player2Score ?? 0,
    raceTo: rawMatch.raceTo || 9,
  }
}

export function normalizeDashboardStats(raw) {
  if (!raw) return null

  const tournamentCount = Array.isArray(raw.tournamentStatusSummary)
    ? raw.tournamentStatusSummary.reduce((sum, item) => sum + item.count, 0)
    : raw.tournaments || 0
  const liveEvents = Array.isArray(raw.tournamentStatusSummary)
    ? raw.tournamentStatusSummary.find((item) => item._id === 'ongoing')?.count || 0
    : raw.liveEvents || 0
  const completedMatches = Array.isArray(raw.matchSummary)
    ? raw.matchSummary.find((item) => item._id === 'completed')?.count || 0
    : raw.completedMatches || 0
  const approvalPending = Array.isArray(raw.registrationSummary)
    ? raw.registrationSummary.find((item) => item._id === 'pending')?.count || 0
    : raw.approvalPending || 0

  return {
    tournaments: tournamentCount,
    liveEvents,
    activePlayers: raw.activePlayers || 0,
    completedMatches,
    busiestEvent: raw.busiestTournament?.tournament?.name || raw.busiestEvent || 'TBD',
    approvalPending,
  }
}
