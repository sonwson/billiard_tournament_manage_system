export function formatTournamentFormat(value) {
  const map = {
    single_elimination: 'Single Elimination',
    double_elimination: 'Double Elimination',
    round_robin: 'Round Robin',
    group_knockout: 'Group Stage + Knockout',
  }

  return map[value] || value || 'Not defined'
}

export function formatKnockoutStartLabel(value) {
  if (!value) return 'Not configured'
  return `Last ${value}`
}

export function formatEventType(value) {
  const map = {
    ranking: 'Ranking',
    open: 'Open',
    invitational: 'Invitational',
    qualifier: 'Qualifier',
  }

  return map[value] || value || 'Event'
}

export function formatTournamentTier(value) {
  const map = {
    local: 'Local',
    monthly: 'Monthly',
    major: 'Major',
  }

  return map[value] || value || 'Tier'
}

export function formatEventClass(eventType, tier) {
  return [formatEventType(eventType), formatTournamentTier(tier)].filter(Boolean).join(' ')
}
