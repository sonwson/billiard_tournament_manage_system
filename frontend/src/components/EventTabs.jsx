import { useAppStore } from '../store/appStore'
import { translateEventTab } from '../utils/i18n'

function EventTabs({ items, activeItem, onChange }) {
  const locale = useAppStore((state) => state.locale)

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => {
        const active = item === activeItem
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              active
                ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {translateEventTab(locale, item)}
          </button>
        )
      })}
    </div>
  )
}

export default EventTabs
