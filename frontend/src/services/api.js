import { apiRequest } from '../lib/apiClient'
import {
  normalizeDashboardStats,
  normalizeMatch,
  normalizePlayer,
  normalizeRegistration,
  normalizeTournament,
} from '../utils/adapters'

export const authService = {
  async refresh(refreshToken) {
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },
  async login(payload) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async forgotPassword(payload) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async resetPassword(payload) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async register(payload) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async logout(refreshToken) {
    return apiRequest('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  },
  async me() {
    return apiRequest('/auth/me')
  },
}

export const userService = {
  async listUsers(filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    return apiRequest(`/users${queryString ? `?${queryString}` : ''}`)
  },
  async updateMe(payload) {
    return apiRequest('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async changePassword(payload) {
    return apiRequest('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async listMyMatches(filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    const response = await apiRequest(`/users/me/matches${queryString ? `?${queryString}` : ''}`)
    return {
      items: (response.data || []).map(normalizeMatch),
      meta: response.meta || null,
    }
  },
  async requestTournamentAdmin(payload = {}) {
    return apiRequest('/users/me/request-tournament-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async listTournamentAdminRequests(filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    return apiRequest(`/users/tournament-admin-requests${queryString ? `?${queryString}` : ''}`)
  },
  async reviewTournamentAdminRequest(userId, payload) {
    return apiRequest(`/users/${userId}/tournament-admin-request/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
  async downgradeTournamentAdmin(userId) {
    return apiRequest(`/users/${userId}/downgrade-tournament-admin`, {
      method: 'POST',
    })
  },
}

export const tournamentService = {
  async list(filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    const response = await apiRequest(`/tournaments${queryString ? `?${queryString}` : ''}`)
    return response.data.map(normalizeTournament)
  },
  async listManageable() {
    const response = await apiRequest('/tournaments/manageable/me?limit=500')
    return response.data.map(normalizeTournament)
  },
  async listTrash() {
    const response = await apiRequest('/tournaments/trash?limit=500')
    return response.data.map(normalizeTournament)
  },
  async getById(eventId) {
    const [response, rankingResponse] = await Promise.all([
      apiRequest(`/tournaments/${eventId}`),
      apiRequest('/rankings'),
    ])

    const matches = response.data.matches || response.data.upcomingMatches || []
    const rankingMap = new Map(
      (rankingResponse.data || []).map((item, index) => {
        const normalized = normalizePlayer(item, index)
        return [normalized.id, normalized]
      }),
    )

    const approvedPlayers = (response.data.approvedPlayers || []).map((item, index) => {
      const normalizedPlayer = normalizePlayer(item, index)
      const rankingSnapshot = rankingMap.get(normalizedPlayer.id)

      if (!rankingSnapshot) {
        return normalizedPlayer
      }

      return {
        ...normalizedPlayer,
        ranking: rankingSnapshot.ranking,
        points: rankingSnapshot.points,
        prizeMoney: rankingSnapshot.prizeMoney,
        wins: rankingSnapshot.wins,
        titles: rankingSnapshot.titles,
      }
    })

    const normalizedEvent = normalizeTournament(response.data.tournament)

    return {
      event: {
        ...normalizedEvent,
        approvedPlayerCount: Math.max(normalizedEvent.approvedPlayerCount || 0, approvedPlayers.length),
        currentPlayerCount: Math.max(normalizedEvent.currentPlayerCount || 0, approvedPlayers.length),
      },
      approvedPlayers,
      upcomingMatches: matches.map(normalizeMatch),
    }
  },
  async getPlayerStats(eventId) {
    const response = await apiRequest(`/tournaments/${eventId}/player-stats`)
    return response.data || {}
  },
  async create(payload) {
    const response = await apiRequest('/tournaments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return normalizeTournament(response.data)
  },
  async update(id, payload) {
    const response = await apiRequest(`/tournaments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return normalizeTournament(response.data)
  },
  async updateStatus(id, status) {
    const response = await apiRequest(`/tournaments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return normalizeTournament(response.data)
  },
  async remove(id) {
    return apiRequest(`/tournaments/${id}`, {
      method: 'DELETE',
    })
  },
  async restore(id) {
    const response = await apiRequest(`/tournaments/${id}/restore`, {
      method: 'PATCH',
    })
    return normalizeTournament(response.data)
  },
  async removePermanently(id) {
    return apiRequest(`/tournaments/${id}/permanent`, {
      method: 'DELETE',
    })
  },
  async generateBracket(id, payload = {}) {
    return apiRequest(`/tournaments/${id}/generate-bracket`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async regenerateBracket(id, payload = {}) {
    return apiRequest(`/tournaments/${id}/regenerate-bracket`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  async listRegistrations(tournamentId, filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    const response = await apiRequest(
      `/tournaments/${tournamentId}/registrations${queryString ? `?${queryString}` : ''}`,
    )

    return {
      items: (response.data || []).map(normalizeRegistration),
      meta: response.meta || null,
    }
  },
  async register(tournamentId, payload = {}) {
    const response = await apiRequest(`/tournaments/${tournamentId}/registrations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return response.data
  },
  async removePlayer(tournamentId, playerId) {
    return apiRequest(`/tournaments/${tournamentId}/players/${playerId}`, {
      method: 'DELETE',
    })
  },
}

export const registrationService = {
  async review(id, payload) {
    const response = await apiRequest(`/registrations/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return normalizeRegistration(response.data)
  },
}

export const matchService = {
  async list() {
    const tournaments = await apiRequest('/tournaments?limit=500')
    const matchLists = await Promise.all(
      tournaments.data.map((tournament) =>
        apiRequest(`/tournaments/${tournament._id || tournament.id}/matches`),
      ),
    )

    return matchLists.flatMap((item) => (item.data || []).map(normalizeMatch))
  },
  async listByTournament(tournamentId, filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    const response = await apiRequest(
      `/tournaments/${tournamentId}/matches${queryString ? `?${queryString}` : ''}`,
    )

    return {
      items: (response.data || []).map(normalizeMatch),
      meta: response.meta || null,
    }
  },
  async updateScore(matchId, payload) {
    const response = await apiRequest(`/matches/${matchId}/score`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return normalizeMatch(response.data.match || response.data)
  },
  async schedule(matchId, payload) {
    const response = await apiRequest(`/matches/${matchId}/schedule`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return normalizeMatch(response.data)
  },
  async updateResult(matchId, payload) {
    const response = await apiRequest(`/matches/${matchId}/result`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return {
      match: normalizeMatch(response.data.match),
      tournamentStatus: response.data.tournamentStatus,
    }
  },
  async generateScoreAccess(matchId) {
    return apiRequest(`/matches/${matchId}/score-access`, {
      method: 'POST',
    })
  },
  async getPublicScoreMatch(token) {
    const response = await apiRequest(`/matches/public/${token}`)
    return {
      mode: response.data.mode || 'match',
      tableNo: response.data.tableNo || null,
      tournamentId: response.data.tournamentId || null,
      tournamentName: response.data.tournamentName || null,
      match: response.data.match ? normalizeMatch(response.data.match) : null,
    }
  },
  async updatePublicScore(token, payload) {
    const response = await apiRequest(`/matches/public/${token}/score`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return {
      mode: response.data.mode || 'match',
      tableNo: response.data.tableNo || null,
      tournamentId: response.data.tournamentId || null,
      tournamentName: response.data.tournamentName || null,
      match: response.data.match ? normalizeMatch(response.data.match) : null,
    }
  },
  async finishPublicMatch(token, payload) {
    const response = await apiRequest(`/matches/public/${token}/result`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return {
      mode: response.data.mode || 'match',
      tableNo: response.data.tableNo || null,
      tournamentId: response.data.tournamentId || null,
      tournamentName: response.data.tournamentName || null,
      match: response.data.match ? normalizeMatch(response.data.match) : null,
    }
  },
}

export const playerService = {
  async list(filters = {}) {
    const searchParams = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })

    const queryString = searchParams.toString()
    const [playerResponse, rankingResponse] = await Promise.all([
      apiRequest(`/players${queryString ? `?${queryString}` : ''}`),
      apiRequest('/rankings'),
    ])

    const rankingMap = new Map(
      (rankingResponse.data || []).map((item, index) => {
        const normalized = normalizePlayer(item, index)
        return [normalized.id, normalized]
      }),
    )

    return (playerResponse.data || []).map((player, index) => {
      const normalizedPlayer = normalizePlayer(player, index)
      const rankingSnapshot = rankingMap.get(normalizedPlayer.id)

      if (!rankingSnapshot) {
        return normalizedPlayer
      }

      return {
        ...normalizedPlayer,
        ranking: rankingSnapshot.ranking,
        points: rankingSnapshot.points,
        prizeMoney: rankingSnapshot.prizeMoney,
        wins: rankingSnapshot.wins,
        titles: rankingSnapshot.titles,
      }
    })
  },
  async create(payload) {
    const response = await apiRequest('/players', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return normalizePlayer(response.data)
  },
  async update(playerId, payload) {
    const response = await apiRequest(`/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return normalizePlayer(response.data)
  },
  async updateMine(payload) {
    const response = await apiRequest('/players/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return normalizePlayer(response.data)
  },
  async remove(id) {
    return apiRequest(`/players/${id}`, {
      method: 'DELETE',
    })
  },
}

export const rankingService = {
  async list() {
    const response = await apiRequest('/rankings')
    return response.data.map((item, index) => normalizePlayer(item, index))
  },
  async recalculate() {
    return apiRequest('/rankings/recalculate', {
      method: 'POST',
    })
  },
  async reset(seasonKey) {
    return apiRequest('/rankings/reset', {
      method: 'POST',
      body: JSON.stringify({ seasonKey }),
    })
  },
  async rollback(playerId, sourceKey, seasonKey) {
    return apiRequest(`/rankings/${playerId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ sourceKey, seasonKey }),
    })
  },
}

export const statisticsService = {
  async dashboard() {
    const response = await apiRequest('/statistics/dashboard')
    return normalizeDashboardStats(response.data)
  },
}

