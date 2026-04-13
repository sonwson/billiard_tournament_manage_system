import en from '../locales/en'
import vi from '../locales/vi'

const dictionaries = {
  en,
  vi,
}

function getValueByPath(object, path) {
  return String(path)
    .split('.')
    .reduce((current, segment) => (current && current[segment] !== undefined ? current[segment] : undefined), object)
}

function interpolate(template, params = {}) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export function t(locale, keyOrEnglish, fallbackVietnamese) {
  if (typeof fallbackVietnamese === 'string') {
    return locale === 'vi' ? fallbackVietnamese : keyOrEnglish
  }

  const dictionary = dictionaries[locale] || dictionaries.en
  const translated = getValueByPath(dictionary, keyOrEnglish) ?? getValueByPath(dictionaries.en, keyOrEnglish) ?? keyOrEnglish

  return typeof translated === 'string' ? interpolate(translated, fallbackVietnamese || {}) : keyOrEnglish
}

export function translateNavLabel(locale, path) {
  const map = {
    '/': 'nav.events',
    '/matches': 'nav.matches',
    '/rankings': 'nav.rankings',
    '/players': 'nav.players',
    '/admin/dashboard': 'nav.admin',
  }

  return t(locale, map[path] || path)
}

export function translateAdminLabel(locale, label) {
  const map = {
    Dashboard: 'admin.dashboard',
    Tournaments: 'admin.tournaments',
    Registrations: 'admin.registrations',
    Matches: 'admin.matches',
    'Admin Requests': 'admin.requests',
    'Admin Console': 'admin.console',
    'Control Room': 'admin.controlRoom',
  }

  return t(locale, map[label] || label)
}

export function translateEventTab(locale, tab) {
  const map = {
    Info: 'eventTabs.info',
    Matches: 'eventTabs.matches',
    Ranking: 'eventTabs.ranking',
    Players: 'eventTabs.players',
  }

  return t(locale, map[tab] || tab)
}

export function translateSkillLevelLabel(locale, value) {
  return t(locale, `skillLevels.${value}`, value || '')
}