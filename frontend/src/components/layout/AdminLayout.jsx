import { BarChart3, ClipboardCheck, GitBranch, ShieldCheck, Trophy, UserRoundCog } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { translateAdminLabel } from '../../utils/i18n'

const adminLinks = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: BarChart3 },
  { label: 'Tournaments', path: '/admin/tournaments', icon: Trophy },
  { label: 'Registrations', path: '/admin/registrations', icon: ClipboardCheck },
  { label: 'Matches', path: '/admin/matches', icon: GitBranch },
  { label: 'Admin Requests', path: '/admin/requests', icon: UserRoundCog },
]

function AdminLayout() {
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const isTotalAdmin = ['admin', 'super_admin'].includes(auth.user?.role)
  const visibleLinks = isTotalAdmin
    ? adminLinks
    : adminLinks.filter((item) => item.path !== '/admin/requests')

  return (
    <section className="admin-shell py-8 lg:py-10">
      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[252px_minmax(0,1fr)] xl:items-start">
        <aside className="xl:sticky xl:top-24">
          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.4)]">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0F172A] text-white">
                  <ShieldCheck className="h-6 w-6 text-[#EAB308]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#EAB308]">{translateAdminLabel(locale, 'Admin Console')}</p>
                  <h1 className="display-title text-[2.65rem] leading-[0.94] text-[#0F172A]">{translateAdminLabel(locale, 'Control Room')}</h1>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.4)]">
              <nav className="space-y-2">
                {visibleLinks.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                          isActive
                            ? 'border border-slate-200 bg-slate-100 text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {translateAdminLabel(locale, item.label)}
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </div>
        </aside>

        <div className="min-w-0 xl:pl-2 2xl:pl-4">
          <Outlet />
        </div>
      </div>
    </section>
  )
}

export default AdminLayout
