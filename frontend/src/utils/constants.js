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
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export const TOURNAMENT_FORMAT_OPTIONS = [
  { value: 'single_elimination', label: 'Loại trực tiếp' },
  { value: 'double_elimination', label: '2 mạng nhánh thắng/thua' },
  { value: 'round_robin', label: 'Vòng tròn' },
  { value: 'group_knockout', label: 'Vòng bảng + loại trực tiếp' },
]

export const RANKING_VIEW_OPTIONS = [
  { value: 'points', label: 'Ranking Theo Điểm' },
  { value: 'prizeMoney', label: 'Ranking Theo Tiền Thưởng' },
]
