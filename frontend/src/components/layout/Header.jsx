import { LogOut, Menu, Settings, Trophy, UserCircle2, UserPlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import brandMark from '../../assets/brand-mark.svg'
import { useAppStore } from '../../store/appStore'
import { NAV_ITEMS } from '../../utils/uiConstants'
import { authService } from '../../services/api'
import { t, translateNavLabel } from '../../utils/i18n'

function navClassName({ isActive }) {
  return `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'
      : 'text-slate-600 hover:bg-white hover:text-[#0F172A]'
  }`
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const clearAuth = useAppStore((state) => state.clearAuth)
  const navigate = useNavigate()
  const userMenuRef = useRef(null)
  const navItems = auth.isAdmin ? [...NAV_ITEMS, { label: 'Admin', path: '/admin/dashboard' }] : NAV_ITEMS

  useEffect(() => {
    function handlePointerDown(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  async function handleLogout() {
    try {
      if (auth.refreshToken) {
        await authService.logout(auth.refreshToken)
      }
    } catch {
      // Clear local auth even if the backend session has already expired.
    } finally {
      setUserMenuOpen(false)
      setMenuOpen(false)
      clearAuth()
      navigate('/login')
    }
  }

  function toggleUserMenu() {
    setUserMenuOpen((prev) => !prev)
  }

  function closeMenus() {
    setMenuOpen(false)
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={brandMark} alt="CueScore" className="h-11 w-11 rounded-2xl" />
          <div>
            <p className="display-title text-xl leading-none text-[#0F172A]">BilliardHub</p>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-slate-500">
              {t(locale, 'header.liveTournament')}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={navClassName}>
              {translateNavLabel(locale, item.path)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!auth.user ? (
            <>
              <Link
                to="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {t(locale, 'header.login')}
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#EAB308] px-4 py-2 text-sm font-bold text-[#0F172A] transition hover:bg-[#f3c623]"
              >
                <Trophy className="h-4 w-4" />
                {t(locale, 'header.joinNow')}
              </Link>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-700">{auth.user.fullName}</p>
          )}

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              onClick={toggleUserMenu}
            >
              <UserCircle2 className="h-5 w-5" />
            </button>

            {userMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] w-72 rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                {auth.user ? (
                  <>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#EAB308]">{t(locale, 'header.signedIn')}</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{auth.user.fullName}</p>
                      <p className="mt-1 text-sm text-slate-500">{auth.user.email || t(locale, 'header.noEmail')}</p>
                    </div>

                    <div className="mt-3 space-y-1">
                      {auth.isAdmin ? (
                        <Link
                          to="/admin/dashboard"
                          onClick={closeMenus}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Settings className="h-4 w-4" />
                          {t(locale, 'header.adminDashboard')}
                        </Link>
                      ) : null}
                      <Link
                        to="/me"
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <UserCircle2 className="h-4 w-4" />
                        {t(locale, 'header.myProfile')}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        {t(locale, 'header.logout')}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#EAB308]">{t(locale, 'header.account')}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {t(locale, 'header.accountHint')}
                      </p>
                    </div>
                    <Link
                      to="/login"
                      onClick={closeMenus}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      {t(locale, 'header.login')}
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMenus}
                      className="flex items-center gap-3 rounded-2xl bg-[#EAB308] px-4 py-3 text-sm font-bold text-[#0F172A] transition hover:bg-[#f3c623]"
                    >
                      <UserPlus className="h-4 w-4" />
                      {t(locale, 'header.createAccount')}
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 text-slate-700 lg:hidden"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="page-shell flex flex-col gap-2 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-semibold ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 border border-slate-200'
                      : 'bg-slate-50 text-slate-700'
                  }`
                }
                onClick={() => setMenuOpen(false)}
              >
                {translateNavLabel(locale, item.path)}
              </NavLink>
            ))}
            {!auth.user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {t(locale, 'header.login')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-2xl bg-[#EAB308] px-4 py-3 text-sm font-bold text-[#0F172A]"
                >
                  {t(locale, 'header.createAccount')}
                </Link>
              </>
            ) : (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{auth.user.fullName}</p>
                <p className="text-sm text-slate-500">{auth.user.email || t(locale, 'header.signedInAccount')}</p>
                {auth.isAdmin ? (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {t(locale, 'header.adminDashboard')}
                  </Link>
                ) : null}
                <Link
                  to="/me"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {t(locale, 'header.myProfile')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-left text-sm font-semibold text-rose-700"
                >
                  {t(locale, 'header.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default Header