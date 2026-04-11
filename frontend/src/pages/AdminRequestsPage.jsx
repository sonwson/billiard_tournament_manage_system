import { Check, RefreshCw, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { userService } from '../services/api'

function AdminRequestsPage() {
  const [busyUserId, setBusyUserId] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const loader = useCallback(() => userService.listTournamentAdminRequests({ status: 'pending', limit: 100 }), [])
  const { data, loading, error, setData } = useAsyncData(loader)
  const requests = data?.data || []

  async function handleReview(userId, action) {
    setBusyUserId(userId)
    setActionError('')
    setActionSuccess('')

    try {
      await userService.reviewTournamentAdminRequest(userId, { action })
      setData((current) => ({
        ...current,
        data: (current?.data || []).filter((item) => item._id !== userId),
      }))
      setActionSuccess(`Request ${action}d successfully.`)
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to review request')
    } finally {
      setBusyUserId('')
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        <SectionHeader
          eyebrow="Permission Review"
          title="Tournament Admin Requests"
          description="Total admins can approve or reject players who request tournament admin access."
        />
        {actionError ? <p className="text-sm font-medium text-red-600">{actionError}</p> : null}
        {actionSuccess ? <p className="text-sm font-medium text-emerald-600">{actionSuccess}</p> : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        {loading ? <p className="text-sm text-slate-500">Loading requests...</p> : null}
        {error ? <p className="text-sm font-medium text-red-600">{error.message}</p> : null}
        {!loading && !error && requests.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No pending tournament admin requests.
          </div>
        ) : null}

        <div className="space-y-4">
          {requests.map((requestUser) => {
            const isBusy = busyUserId === requestUser._id

            return (
              <article
                key={requestUser._id}
                className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 xl:grid-cols-[1.1fr_0.8fr_0.8fr]"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{requestUser.fullName}</h3>
                  <p className="mt-2 text-sm text-slate-500">{requestUser.email || 'No email'}</p>
                  <p className="mt-1 text-sm text-slate-500">{requestUser.phone || 'No phone'}</p>
                </div>

                <div className="text-sm text-slate-500">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Request Note</p>
                  <p className="mt-2">{requestUser.tournamentAdminRequest?.note || 'No note provided'}</p>
                </div>

                <div className="grid gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleReview(requestUser._id, 'approve')}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleReview(requestUser._id, 'reject')}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminRequestsPage
