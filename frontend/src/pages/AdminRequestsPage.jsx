import { Check, RefreshCw, Shield, X, UserMinus } from 'lucide-react'
import { useCallback, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { userService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { t } from '../utils/i18n'

function AdminRequestsPage() {
  const auth = useAppStore((state) => state.auth)
  const locale = useAppStore((state) => state.locale)
  const pushToast = useAppStore((state) => state.pushToast)
  const isSuperAdmin = ['admin', 'super_admin'].includes(auth.user?.role)
  const [busyUserId, setBusyUserId] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [showTournamentAdmins, setShowTournamentAdmins] = useState(false)

  const loader = useCallback(() => userService.listTournamentAdminRequests({ status: 'pending', limit: 100 }), [])
  const { data: pendingData, loading: pendingLoading, error: pendingError, setData: setPendingData } = useAsyncData(loader)
  const pendingRequests = pendingData?.data || []

  const adminsLoader = useCallback(() => userService.listUsers({ role: 'tournament_admin', limit: 500 }), [])
  const { data: adminsData, loading: adminsLoading, reload: reloadAdmins } = useAsyncData(adminsLoader)
  const tournamentAdmins = adminsData?.data || []

  async function handleReview(userId, action) {
    setBusyUserId(userId)
    setActionError('')
    setActionSuccess('')

    try {
      await userService.reviewTournamentAdminRequest(userId, { action })
      setPendingData((current) => ({
        ...current,
        data: (current?.data || []).filter((item) => item._id !== userId),
      }))
      setActionSuccess(t(locale, 'adminRequests.reviewSuccess', { action }))
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminRequests.reviewFailed'))
    } finally {
      setBusyUserId('')
    }
  }

  async function handleDowngrade(userId, userName) {
    if (!window.confirm(t(locale, 'adminRequests.downgradeConfirm', { name: userName }))) {
      return
    }

    setBusyUserId(userId)
    setActionError('')
    setActionSuccess('')

    try {
      await userService.downgradeTournamentAdmin(userId)
      await reloadAdmins(false)
      pushToast({
        type: 'success',
        title: t(locale, 'adminRequests.downgradeSuccessTitle'),
        message: t(locale, 'adminRequests.downgradeSuccessMessage', { name: userName }),
      })
    } catch (caughtError) {
      setActionError(caughtError.message || t(locale, 'adminRequests.downgradeFailed'))
    } finally {
      setBusyUserId('')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <SectionHeader
          eyebrow={t(locale, 'adminRequests.eyebrow')}
          title={t(locale, 'adminRequests.title')}
          description={t(locale, 'adminRequests.description')}
        />
        {actionError ? <p className="mb-4 text-sm font-medium text-red-600">{actionError}</p> : null}
        {actionSuccess ? <p className="mb-4 text-sm font-medium text-emerald-600">{actionSuccess}</p> : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowTournamentAdmins(false)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!showTournamentAdmins ? 'bg-[#0F172A] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {t(locale, 'adminRequests.pendingRequests')}
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowTournamentAdmins(true)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${showTournamentAdmins ? 'bg-[#0F172A] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {t(locale, 'adminRequests.currentAdmins')}
            </button>
          )}
        </div>

        {!showTournamentAdmins ? (
          <>
            {pendingLoading ? <p className="text-sm text-slate-500">{t(locale, 'adminRequests.loading')}</p> : null}
            {pendingError ? <p className="text-sm font-medium text-red-600">{pendingError.message}</p> : null}
            {!pendingLoading && !pendingError && pendingRequests.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                {t(locale, 'adminRequests.empty')}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {pendingRequests.map((requestUser) => {
                const isBusy = busyUserId === requestUser._id

                return (
                  <article
                    key={requestUser._id}
                    className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 xl:grid-cols-[1.1fr_0.8fr_0.8fr]"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{requestUser.fullName}</h3>
                      <p className="mt-2 text-sm text-slate-500">{requestUser.email || t(locale, 'adminRequests.noEmail')}</p>
                      <p className="mt-1 text-sm text-slate-500">{requestUser.phone || t(locale, 'adminRequests.noPhone')}</p>
                    </div>

                    <div className="text-sm text-slate-500">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRequests.requestNote')}</p>
                      <p className="mt-2">{requestUser.tournamentAdminRequest?.note || t(locale, 'adminRequests.noNote')}</p>
                    </div>

                    <div className="grid gap-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(requestUser._id, 'approve')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {t(locale, 'adminRequests.approve')}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReview(requestUser._id, 'reject')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        {t(locale, 'adminRequests.reject')}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        ) : (
          <>
            {adminsLoading ? <p className="text-sm text-slate-500">{t(locale, 'adminRequests.loading')}</p> : null}
            {tournamentAdmins.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                {t(locale, 'adminRequests.noTournamentAdmins')}
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              {tournamentAdmins.map((adminUser) => {
                const isBusy = busyUserId === adminUser._id

                return (
                  <article
                    key={adminUser._id}
                    className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 xl:grid-cols-[1.1fr_0.8fr_0.6fr]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-bold text-slate-900">{adminUser.fullName}</h3>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{adminUser.email || t(locale, 'adminRequests.noEmail')}</p>
                      <p className="mt-1 text-sm text-slate-500">{adminUser.phone || t(locale, 'adminRequests.noPhone')}</p>
                    </div>

                    <div className="text-sm text-slate-500">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t(locale, 'adminRequests.role')}</p>
                      <p className="mt-2 font-semibold text-slate-900">{t(locale, `roles.${adminUser.role}`)}</p>
                    </div>

                    <div className="grid gap-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDowngrade(adminUser._id, adminUser.fullName)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                        {t(locale, 'adminRequests.downgrade')}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminRequestsPage
