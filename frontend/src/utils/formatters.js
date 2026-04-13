export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return `${start.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })} - ${end.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`
}

export function formatMatchTime(value) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatSkillLevel(value) {
  if (!value) return 'Open'
  return value
}

export function getStatusTone(status) {
  const map = {
    live: 'bg-red-500 text-white',
    scheduled: 'bg-slate-200 text-slate-700',
    finished: 'bg-emerald-100 text-emerald-700',
    open: 'bg-amber-100 text-amber-700',
    ranking: 'bg-blue-100 text-blue-800',
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
    cancelled: 'bg-slate-200 text-slate-700',
  }

  return map[status] || 'bg-slate-200 text-slate-700'
}

export function stripDiacritics(value) {
  if (!value) return ''

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

export function formatTournamentFormat(value) {
  const map = {
    single_elimination: 'Loại trực tiếp',
    double_elimination: '2 mạng thắng/thua',
    round_robin: 'Vòng tròn',
    group_knockout: 'Vòng bảng + loại trực tiếp',
  }

  return map[value] || value || 'Chưa xác định'
}
