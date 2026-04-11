import { ArrowLeft, KeyRound, Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAppStore } from '../store/appStore'

function ForgotPasswordPage() {
  const pushToast = useAppStore((state) => state.pushToast)
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [developmentCode, setDevelopmentCode] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('')
  const navigate = useNavigate()

  const canContinue = sentEmail && verificationCode.trim().length === 6

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)

    try {
      const response = await authService.forgotPassword({ email })
      const nextDeliveryMethod = response.data?.deliveryMethod || ''
      const nextVerificationCode = response.data?.verificationCode || ''

      setSentEmail(email)
      setDeliveryMethod(nextDeliveryMethod)
      setDevelopmentCode(nextVerificationCode)
      setVerificationCode(nextVerificationCode || '')

      pushToast({
        type: 'success',
        title: 'Verification code sent',
        message: nextDeliveryMethod === 'console'
          ? 'SMTP fallback is active, so the verification code is shown below for development testing.'
          : 'Please check your email for the 6-digit verification code.',
      })
    } catch (error) {
      pushToast({ type: 'error', title: 'Unable to send code', message: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  function handleContinue() {
    if (!canContinue) {
      pushToast({
        type: 'warning',
        title: 'Verification code required',
        message: 'Enter the 6-digit code that was sent to your email before continuing.',
      })
      return
    }

    navigate('/reset-password', {
      state: {
        email: sentEmail || email,
        verificationCode,
      },
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(234,179,8,0.14),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(20,33,61,0.1),transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="glass-panel w-full rounded-[2rem] p-6 sm:p-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.34em] text-[#EAB308]">Password Recovery</p>
          <h1 className="display-title mt-3 text-4xl text-[#0F172A]">Forgot Password</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">Enter your account email and we will send a 6-digit verification code for password reset.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Mail className="h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  className="w-full border-none bg-transparent outline-none"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting || !email}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>

          {sentEmail ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-sm font-semibold text-slate-900">Enter verification code</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                We sent a 6-digit code to <span className="font-semibold text-slate-700">{sentEmail}</span>.
              </p>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Verification Code</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                  <input
                    className="w-full border-none bg-transparent uppercase tracking-[0.45em] outline-none"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </label>
            </div>
          ) : null}

          {deliveryMethod === 'console' ? (
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-semibold text-sky-900">SMTP is not configured yet</p>
              <p className="mt-2 text-sm leading-6 text-sky-800">
                You do not need to deploy for forgot password to work. You only need valid SMTP settings in the backend .env.
                Right now the app is in local fallback mode, so the verification code is shown below for testing.
              </p>
            </div>
          ) : null}

          {developmentCode ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Development verification code</p>
              <p className="mt-2 text-2xl font-bold tracking-[0.24em] text-amber-950">{developmentCode}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Continue to Reset Password
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
