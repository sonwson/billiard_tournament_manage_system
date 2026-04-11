import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const toneMap = {
  success: { icon: CheckCircle2, classes: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  error: { icon: AlertCircle, classes: 'border-red-200 bg-red-50 text-red-900' },
  warning: { icon: TriangleAlert, classes: 'border-amber-200 bg-amber-50 text-amber-900' },
  info: { icon: Info, classes: 'border-slate-200 bg-white text-slate-900' },
}

function ToastViewport() {
  const toasts = useAppStore((state) => state.toasts)
  const removeToast = useAppStore((state) => state.removeToast)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const tone = toneMap[toast.type] || toneMap.info
        const Icon = tone.icon

        return (
          <div key={toast.id} className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${tone.classes}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                {toast.title ? <p className="text-sm font-bold">{toast.title}</p> : null}
                {toast.message ? <p className="mt-1 text-sm leading-6 opacity-90">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ToastViewport
