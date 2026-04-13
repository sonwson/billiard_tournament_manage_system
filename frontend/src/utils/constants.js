export const ROUTES = {
  events: '/',
  eventDetail: '/events/:eventId',
  matches: '/matches',
  rankings: '/rankings',
  players: '/players',
  myProfile: '/me',
  login: '/login',
  register: '/register',
}

export const NAV_ITEMS = [
  { label: 'Events', path: '/' },
  { label: 'Matches', path: '/matches' },
  { label: 'Rankings', path: '/rankings' },
  { label: 'Players', path: '/players' },
]

export const EVENT_TABS = ['Info', 'Matches', 'Ranking', 'Players']

export const SKILL_LEVEL_OPTIONS = [
  { value: 'CN', label: 'CN' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
  { value: 'H', label: 'H' },
  { value: 'I', label: 'I' },
  { value: 'K', label: 'K' },
]

export const TOURNAMENT_FORMAT_OPTIONS = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'group_knockout', label: 'Group Stage + Knockout' },
]

export const RANKING_VIEW_OPTIONS = [
  { value: 'points', label: 'Rank by Points' },
  { value: 'prizeMoney', label: 'Rank by Prize Money' },
]
