import { ArrowLeft, KeyRound, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAppStore } from '../store/appStore'

function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const pushToast = useAppStore((state) => state.pushToast)
  const [formState, setFormState] = useState({
    email: location.state?.email || '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)

  function updateField(key, value) {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formState.newPassword !== formState.confirmPassword) {
      pushToast({ type: 'warning', title: 'Password mismatch', message: 'Please make sure the new password and confirmation match.' })
      return
    }

    setSubmitting(true)
    try {
      await authService.resetPassword({
        email: formState.email,
        verificationCode: formState.verificationCode,
        newPassword: formState.newPassword,
      })

      pushToast({ type: 'success', title: 'Password reset complete', message: 'You can now sign in with your new password.' })
      navigate('/login')
    } catch (error) {
      pushToast({ type: 'error', title: 'Reset failed', message: error.message })
    } finally {
      setSubmitting(false)
    }
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

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.34em] text-[#EAB308]">Verification</p>
          <h1 className="display-title mt-3 text-4xl text-[#0F172A]">Reset Password</h1>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" type="email" value={formState.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Verification Code</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <KeyRound className="h-5 w-5 text-slate-400" />
                <input className="w-full border-none bg-transparent uppercase tracking-[0.4em] outline-none" maxLength={6} value={formState.verificationCode} onChange={(event) => updateField('verificationCode', event.target.value.replace(/\D/g, ''))} />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">New Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <LockKeyhole className="h-5 w-5 text-slate-400" />
                <input type="password" className="w-full border-none bg-transparent outline-none" value={formState.newPassword} onChange={(event) => updateField('newPassword', event.target.value)} />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <LockKeyhole className="h-5 w-5 text-slate-400" />
                <input type="password" className="w-full border-none bg-transparent outline-none" value={formState.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />
              </div>
            </label>

            <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0F172A] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60">
              {submitting ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
