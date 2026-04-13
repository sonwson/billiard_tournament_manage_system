import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function FormField({ label, type = 'text', placeholder, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#EAB308]"
      />
    </label>
  )
}

function RegisterPage() {
  const [formState, setFormState] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    country: '',
    birthdate: '',
    receiveCommunication: false,
    agreedTerms: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const setAuth = useAppStore((state) => state.setAuth)
  const pushToast = useAppStore((state) => state.pushToast)
  const locale = useAppStore((state) => state.locale)
  const navigate = useNavigate()

  function updateField(key, value) {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formState.password !== formState.confirmPassword) {
      pushToast({
        type: 'warning',
        title: t(locale, 'registerPage.passwordMismatch'),
        message: t(locale, 'registerPage.passwordMismatchMessage'),
      })
      return
    }

    if (!formState.agreedTerms) {
      pushToast({
        type: 'warning',
        title: t(locale, 'registerPage.termsRequired'),
        message: t(locale, 'registerPage.termsRequiredMessage'),
      })
      return
    }

    setSubmitting(true)

    try {
      const fullName = `${formState.firstName} ${formState.lastName}`.trim()

      if (!fullName || fullName.length < 2) {
        pushToast({
          type: 'warning',
          title: t(locale, 'registerPage.missingName'),
          message: t(locale, 'registerPage.missingNameMessage'),
        })
        setSubmitting(false)
        return
      }

      const response = await authService.register({
        fullName,
        email: formState.email,
        phone: formState.phone || undefined,
        password: formState.password,
        club: '',
        city: formState.country,
      })

      setAuth(response.data)
      pushToast({
        type: 'success',
        title: t(locale, 'registerPage.accountCreated'),
        message: t(locale, 'registerPage.accountCreatedMessage'),
      })
      navigate('/')
    } catch (caughtError) {
      pushToast({
        type: 'error',
        title: t(locale, 'registerPage.registrationFailed'),
        message:
          caughtError.payload?.error?.details?.fieldErrors?.body?.[0]
          || caughtError.message
          || t(locale, 'registerPage.registrationFailedMessage'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.14),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(20,33,61,0.1),transparent_28%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#EAB308]">
            {t(locale, 'registerPage.eyebrow')}
          </p>
          <h1 className="display-title mt-4 text-5xl leading-none text-[#0F172A] sm:text-6xl">
            {t(locale, 'registerPage.title')}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-500">
            {t(locale, 'registerPage.description')}
          </p>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label={t(locale, 'registerPage.email')} type="email" placeholder="player@example.com" value={formState.email} onChange={(event) => updateField('email', event.target.value)} />
            <FormField label={t(locale, 'registerPage.phone')} placeholder="0901234567" value={formState.phone} onChange={(event) => updateField('phone', event.target.value)} />
            <FormField label={t(locale, 'registerPage.country')} placeholder="Vietnam" value={formState.country} onChange={(event) => updateField('country', event.target.value)} />
            <FormField label={t(locale, 'registerPage.password')} type="password" placeholder={t(locale, 'registerPage.createStrongPassword')} value={formState.password} onChange={(event) => updateField('password', event.target.value)} />
            <FormField label={t(locale, 'registerPage.confirmPassword')} type="password" placeholder={t(locale, 'registerPage.repeatPassword')} value={formState.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />
            <FormField label={t(locale, 'registerPage.firstName')} placeholder="Minh" value={formState.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
            <FormField label={t(locale, 'registerPage.lastName')} placeholder="Nguyen" value={formState.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
            <FormField label={t(locale, 'registerPage.birthdate')} type="date" value={formState.birthdate} onChange={(event) => updateField('birthdate', event.target.value)} />

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">{t(locale, 'registerPage.preferredTourName')}</span>
              <input
                type="text"
                placeholder={t(locale, 'registerPage.cueNameHint')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-[#EAB308]"
                value={`${formState.firstName} ${formState.lastName}`.trim()}
                readOnly
              />
            </label>

            <label className="md:col-span-2 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#EAB308]"
                checked={formState.agreedTerms}
                onChange={(event) => updateField('agreedTerms', event.target.checked)}
              />
              <span className="text-sm leading-6 text-slate-600">
                {t(locale, 'registerPage.termsText')}
              </span>
            </label>

            <label className="md:col-span-2 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#EAB308]"
                checked={formState.receiveCommunication}
                onChange={(event) => updateField('receiveCommunication', event.target.checked)}
              />
              <span className="text-sm leading-6 text-slate-600">
                {t(locale, 'registerPage.receiveText')}
              </span>
            </label>

            <div className="md:col-span-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {t(locale, 'registerPage.alreadyHaveAccount')}{' '}
                <Link to="/login" className="font-semibold text-[#14213D]">
                  {t(locale, 'registerPage.loginHere')}
                </Link>
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-70"
              >
                {submitting ? t(locale, 'registerPage.creating') : t(locale, 'registerPage.createAccount')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage