import { getStatusTone } from '../../utils/formatters'

function StatusBadge({ children, tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${getStatusTone(
        tone,
      )}`}
    >
      {children}
    </span>
  )
}

export default StatusBadge
