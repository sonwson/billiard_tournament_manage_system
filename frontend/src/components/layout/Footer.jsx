import { useAppStore } from '../../store/appStore'
import { t } from '../../utils/i18n'

function Footer() {
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  return (
    <footer className="mt-20 border-t border-slate-200 bg-[#0F172A] text-slate-200">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <p className="display-title text-2xl text-white">BilliardHub</p>
          <p className="max-w-sm text-sm leading-6 text-slate-400">
            {t(locale, 'footer.description')}
          </p>
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#EAB308]">
            {t(locale, 'footer.contact')}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>support@billiardhub.live</p>
            <p>+84 865 590 162</p>
            <p>Ha Dong, Ha Noi</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#EAB308]">
              {t(locale, 'footer.legal')}
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>{t(locale, 'footer.terms')}</p>
              <p>{t(locale, 'footer.privacy')}</p>
              <p>{t(locale, 'footer.media')}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#EAB308]">
              {t(locale, 'footer.language')}
            </p>
            <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1.5">
              {[
                { value: 'en', label: 'English' },
                { value: 'vi', label: t(locale, 'footer.vietnamese') },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLocale(option.value)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    locale === option.value
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer