export function t(locale, english, vietnamese) {
  return locale === 'vi' ? vietnamese : english
}

export function translateNavLabel(locale, path) {
  const map = {
    '/': t(locale, 'Events', 'Giải đấu'),
    '/matches': t(locale, 'Matches', 'Trận đấu'),
    '/rankings': t(locale, 'Rankings', 'Xếp hạng'),
    '/players': t(locale, 'Players', 'Cơ thủ'),
    '/admin/dashboard': t(locale, 'Admin', 'Quản trị'),
  }

  return map[path] || path
}

export function translateAdminLabel(locale, label) {
  const map = {
    Dashboard: t(locale, 'Dashboard', 'Bảng điều khiển'),
    Tournaments: t(locale, 'Tournaments', 'Giải đấu'),
    Registrations: t(locale, 'Registrations', 'Đăng ký'),
    Matches: t(locale, 'Matches', 'Trận đấu'),
    'Admin Requests': t(locale, 'Admin Requests', 'Yêu cầu quản trị'),
    'Admin Console': t(locale, 'Admin Console', 'Bảng quản trị'),
    'Control Room': t(locale, 'Control Room', 'Trung tâm điều hành'),
  }

  return map[label] || label
}

export function translateEventTab(locale, tab) {
  const map = {
    Info: t(locale, 'Info', 'Thông tin'),
    Matches: t(locale, 'Matches', 'Trận đấu'),
    Ranking: t(locale, 'Ranking', 'Xếp hạng'),
    Players: t(locale, 'Players', 'Cơ thủ'),
  }

  return map[tab] || tab
}

export function translateSkillLevelLabel(locale, value) {
  const map = {
    beginner: t(locale, 'Beginner', 'Mới bắt đầu'),
    intermediate: t(locale, 'Intermediate', 'Trung cấp'),
    advanced: t(locale, 'Advanced', 'Nâng cao'),
    pro: t(locale, 'Pro', 'Chuyên nghiệp'),
  }

  return map[value] || value
}
