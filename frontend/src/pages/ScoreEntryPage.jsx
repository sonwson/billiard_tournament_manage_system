import { CheckCircle2, Minus, Plus, QrCode, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsyncData } from '../hooks/useAsyncData'
import { matchService } from '../services/api'
import { formatMatchTime } from '../utils/formatters'

function ScoreEntryPage() {
  const { token } = useParams()
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ player1Score: 0, player2Score: 0 })
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const loader = useCallback(() => matchService.getPublicScoreMatch(token), [token])
  const { data, loading, error, setData } = useAsyncData(loader, { refreshMs: 5000 })

  const match = data?.match || null
  const tableNo = data?.tableNo || match?.table || 'Table'
  const isCompleted = match?.status === 'finished'

  useEffect(() => {
    if (!match) {
      setDraft({ player1Score: 0, player2Score: 0 })
      return
    }

    setDraft({
      player1Score: match.score1 ?? 0,
      player2Score: match.score2 ?? 0,
    })
  }, [match, match?.id, match?.score1, match?.score2])

  const activeDraft = useMemo(() => ({
    player1Score: draft.player1Score ?? match?.score1 ?? 0,
    player2Score: draft.player2Score ?? match?.score2 ?? 0,
  }), [draft.player1Score, draft.player2Score, match?.score1, match?.score2])

  const canFinishMatch = useMemo(() => {
    if (!match || isCompleted) return false
    if (activeDraft.player1Score === activeDraft.player2Score) return false
    return Math.max(activeDraft.player1Score, activeDraft.player2Score) >= (match.raceTo ?? Number.POSITIVE_INFINITY)
  }, [activeDraft.player1Score, activeDraft.player2Score, isCompleted, match])

  async function adjust(field, delta) {
    if (!match || busy || isCompleted) return

    const nextPayload = {
      player1Score: field === 'player1Score' ? Math.max(0, activeDraft.player1Score + delta) : activeDraft.player1Score,
      player2Score: field === 'player2Score' ? Math.max(0, activeDraft.player2Score + delta) : activeDraft.player2Score,
    }

    setDraft(nextPayload)
    setBusy(true)
    setActionError('')
    setActionSuccess('')
    try {
      const response = await matchService.updatePublicScore(token, nextPayload)
      setData(response)
      setDraft({
        player1Score: response.match?.score1 ?? 0,
        player2Score: response.match?.score2 ?? 0,
      })
      setActionSuccess('Live score updated successfully.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to update live score.')
    } finally {
      setBusy(false)
    }
  }

  async function finishMatch() {
    if (!match || busy || !canFinishMatch) return

    setBusy(true)
    setActionError('')
    setActionSuccess('')
    try {
      const response = await matchService.finishPublicMatch(token, activeDraft)
      setData(response)
      setActionSuccess(response.match ? 'Match finished. The table moved to the next assigned pairing.' : 'Match finished. Waiting for the next match on this table.')
    } catch (caughtError) {
      setActionError(caughtError.message || 'Unable to finish match.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.95)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EAB308] text-[#0F172A]">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#EAB308]">Table Score Entry</p>
                <h1 className="display-title mt-2 text-4xl">{tableNo}</h1>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#16233D] px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Tournament</p>
              <p className="mt-2 text-lg font-semibold text-white">{data?.tournamentName || 'Live Table Feed'}</p>
            </div>
          </div>

          {loading ? <p className="mt-6 text-sm text-slate-300">Loading table assignment...</p> : null}
          {error ? <p className="mt-6 text-sm font-medium text-red-300">{error.message}</p> : null}
          {actionError ? <p className="mt-6 text-sm font-medium text-red-300">{actionError}</p> : null}
          {actionSuccess ? <p className="mt-6 text-sm font-medium text-emerald-300">{actionSuccess}</p> : null}

          {!loading && !error && !match ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/15 bg-[#16233D] px-6 py-10 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Waiting For Next Match</p>
              <p className="mt-3 text-base text-slate-200">
                This QR code is linked to {tableNo}. As soon as the next match is assigned to this table, the player names and score will appear automatically.
              </p>
            </div>
          ) : null}

          {match ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#16233D] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">{match.roundLabel}</p>
                    <p className="mt-2 text-sm text-slate-400">{formatMatchTime(match.scheduledAt)} | Race to {match.raceTo}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
                    {match.table}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { field: 'player1Score', label: match.player1Name || 'Player 1', value: activeDraft.player1Score },
                    { field: 'player2Score', label: match.player2Name || 'Player 2', value: activeDraft.player2Score },
                  ].map((item) => (
                    <div key={item.field} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                      <div className="mt-6 flex items-center justify-between gap-3">
                        <button type="button" onClick={() => adjust(item.field, -1)} disabled={busy || isCompleted} className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-60">
                          <Minus className="h-5 w-5" />
                        </button>
                        <div className="display-title text-6xl text-[#EAB308]">{item.value}</div>
                        <button type="button" onClick={() => adjust(item.field, 1)} disabled={busy || isCompleted} className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-60">
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-[#16233D] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Table QR Logic</p>
                <div className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  <p>This QR is linked to the table, not to a single match.</p>
                  <p>When the current match finishes and the next ready match is assigned to {tableNo}, this screen will automatically switch to the next two players with score reset to 0-0.</p>
                  <p>Live score changes are saved instantly. You can also finish the match directly from this table screen.</p>
                </div>
                <button
                  type="button"
                  disabled={busy || !canFinishMatch}
                  onClick={finishMatch}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#EAB308] px-4 py-3 text-sm font-bold text-[#0F172A] transition hover:bg-[#f6c81e] disabled:opacity-60"
                >
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Finish Match
                </button>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                  Realtime table updates are active.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default ScoreEntryPage
