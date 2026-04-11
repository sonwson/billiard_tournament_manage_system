import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function LoginPage() {
  const [formState, setFormState] = useState({
    emailOrPhone: '',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const setAuth = useAppStore((state) => state.setAuth)
  const pushToast = useAppStore((state) => state.pushToast)
  const locale = useAppStore((state) => state.locale)
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)

    try {
      const response = await authService.login(formState)
      setAuth(response.data)
      pushToast({
        type: 'success',
        title: t(locale, 'Welcome back', 'Chào mừng trở lại'),
        message: t(locale, 'You have signed in successfully.', 'Bạn đã đăng nhập thành công.'),
      })

      const redirectTo = ['admin', 'super_admin', 'tournament_admin'].includes(response.data.user?.role)
        ? (location.state?.from || '/admin/dashboard')
        : '/'

      navigate(redirectTo)
    } catch (caughtError) {
      pushToast({
        type: 'error',
        title: t(locale, 'Login failed', 'Đăng nhập thất bại'),
        message: caughtError.message || t(locale, 'Unable to login right now.', 'Hiện chưa thể đăng nhập.'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F172A]">
      <img
        src="https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1600&q=80"
        alt="Billiards background"
        className="absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#14213D]/92 to-[#0F172A]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden lg:block">
            <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#EAB308]">
              {t(locale, 'Tournament Control', 'Điều hành giải đấu')}
            </p>
            <h1 className="display-title mt-5 text-7xl leading-none text-white">
              {t(locale, 'Log In To', 'Đăng nhập vào')}
              <br />
              BilliardHub
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              {t(
                locale,
                'Manage your player account, follow live scores, and stay on top of rankings and event registration windows.',
                'Quản lý tài khoản cơ thủ, theo dõi tỷ số trực tiếp và cập nhật bảng xếp hạng cũng như thời gian mở đăng ký giải đấu.',
              )}
            </p>
          </div>

          <div className="glass-panel mx-auto w-full max-w-xl rounded-[2rem] p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-[0.34em] text-[#EAB308]">
                {t(locale, 'Welcome Back', 'Chào mừng trở lại')}
              </p>
              <h2 className="display-title mt-3 text-4xl text-[#0F172A]">{t(locale, 'Sign In', 'Đăng nhập')}</h2>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {t(locale, 'Email or phone', 'Email hoặc số điện thoại')}
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                  <input
                    className="w-full border-none bg-transparent outline-none"
                    type="text"
                    placeholder="you@example.com"
                    value={formState.emailOrPhone}
                    onChange={(event) => setFormState((prev) => ({ ...prev, emailOrPhone: event.target.value }))}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t(locale, 'Password', 'Mật khẩu')}</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <LockKeyhole className="h-5 w-5 text-slate-400" />
                  <input
                    className="w-full border-none bg-transparent outline-none"
                    type="password"
                    placeholder="••••••••"
                    value={formState.password}
                    onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
              </label>

              <div className="flex items-center justify-between text-sm">
                <Link to="/register" className="font-semibold text-slate-500 transition hover:text-[#0F172A]">
                  {t(locale, 'Need an account?', 'Chưa có tài khoản?')}
                </Link>
                <Link to="/forgot-password" className="font-semibold text-[#14213D]">
                  {t(locale, 'Forgot Password', 'Quên mật khẩu')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EAB308] px-5 py-4 text-sm font-bold text-[#0F172A] transition hover:bg-[#f3c623] disabled:opacity-70"
              >
                {submitting ? t(locale, 'Signing In...', 'Đang đăng nhập...') : t(locale, 'Login', 'Đăng nhập')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
