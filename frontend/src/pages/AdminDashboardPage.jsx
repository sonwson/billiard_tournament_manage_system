import { ArrowRight, Info } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import SectionHeader from '../components/ui/SectionHeader'
import StatTile from '../components/ui/StatTile'
import { useAsyncData } from '../hooks/useAsyncData'
import { statisticsService, tournamentService } from '../services/api'
import { useAppStore } from '../store/appStore'

function AdminDashboardPage() {
  const auth = useAppStore((state) => state.auth)
  const isTotalAdmin = ['admin', 'super_admin'].includes(auth.user?.role)
  const statsLoader = useCallback(() => statisticsService.dashboard(), [])
  const tournamentsLoader = useCallback(() => tournamentService.listManageable(), [])
  const { data: stats, loading: statsLoading, error: statsError } = useAsyncData(statsLoader)
  const { data: tournaments, loading: tournamentsLoading, error: tournamentsError } = useAsyncData(tournamentsLoader)

  const upcoming = (tournaments || []).slice(0, 4)

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Admin Dashboard"
        description={isTotalAdmin
          ? 'A quick operational snapshot for live events, approvals, match volume, and tournament activity.'
          : 'Focused workspace for the tournaments you manage. Global platform statistics are hidden for tournament admins.'}
        action={
          <a
            href="http://localhost:5000/docs"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open Swagger Docs
          </a>
        }
      />

      {isTotalAdmin ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile label="Tournaments" value={statsLoading ? '...' : stats?.tournaments || 0} accent />
            <StatTile label="Live Events" value={statsLoading ? '...' : stats?.liveEvents || 0} />
            <StatTile label="Active Players" value={statsLoading ? '...' : stats?.activePlayers || 0} />
            <StatTile label="Completed Matches" value={statsLoading ? '...' : stats?.completedMatches || 0} />
            <StatTile label="Pending Approvals" value={statsLoading ? '...' : stats?.approvalPending || 0} />
            <StatTile label="Busiest Event" value={statsLoading ? '...' : stats?.busiestEvent || 'TBD'} />
          </div>

          {statsError ? <p className="text-sm font-medium text-red-600">{statsError.message}</p> : null}
        </>
      ) : (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.4)]">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Tournament admin view</p>
              <p className="mt-1 leading-6">
                Deleted tournaments are excluded from your dashboard, and this screen focuses on the events you directly manage instead of platform-wide totals.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#EAB308]">Operations</p>
            <h2 className="display-title mt-2 text-3xl text-[#0F172A]">Upcoming Events</h2>
          </div>
          <Link
            to="/admin/tournaments"
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-[#EAB308]/40 bg-amber-50 px-4 py-3 text-sm font-bold text-[#14213D] transition hover:bg-amber-100"
          >
            <span>Manage Tournaments</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {(tournamentsLoading ? [] : upcoming).map((tournament) => (
            <div
              key={tournament.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{tournament.name}</p>
                <p className="text-sm text-slate-500">{tournament.location}</p>
              </div>
              <div className="text-sm font-medium text-slate-600">{tournament.rawStatus || tournament.status}</div>
            </div>
          ))}

          {tournamentsLoading ? <p className="text-sm text-slate-500">Loading tournaments...</p> : null}
          {tournamentsError ? <p className="text-sm font-medium text-red-600">{tournamentsError.message}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
