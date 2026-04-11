import { KeyRound, ShieldCheck, UserRoundCog } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import MatchResultsList from '../components/MatchResultsList'
import SectionHeader from '../components/ui/SectionHeader'
import { authService, playerService, userService } from '../services/api'
import { useAppStore } from '../store/appStore'
import { SKILL_LEVEL_OPTIONS } from '../utils/uiConstants'
import { resizeImageFileToDataUrl } from '../utils/file'

function MyProfilePage() {
  const auth = useAppStore((state) => state.auth)
  const mergeAuth = useAppStore((state) => state.mergeAuth)
  const pushToast = useAppStore((state) => state.pushToast)
  const [loading, setLoading] = useState(true)
  const [savingAccount, setSavingAccount] = useState(false)
  const [savingPlayer, setSavingPlayer] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [requestingAdmin, setRequestingAdmin] = useState(false)
  const [profile, setProfile] = useState({ user: null, player: null })
  const [myMatches, setMyMatches] = useState([])
  const [accountForm, setAccountForm] = useState({ fullName: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [playerForm, setPlayerForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    club: '',
    city: '',
    skillLevel: 'beginner',
    avatarUrl: '',
  })

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)
      try {
        const [profileResponse, myMatchesResponse] = await Promise.all([
          authService.me(),
          userService.listMyMatches(),
        ])
        if (!active) return

        const nextProfile = profileResponse.data
        setProfile(nextProfile)
        setMyMatches(myMatchesResponse.items || [])
        setAccountForm({
          fullName: nextProfile.user?.fullName || '',
          phone: nextProfile.user?.phone || '',
        })
        setPlayerForm({
          displayName: nextProfile.player?.displayName || '',
          email: nextProfile.player?.email || nextProfile.user?.email || '',
          phone: nextProfile.player?.phone || nextProfile.user?.phone || '',
          club: nextProfile.player?.club || '',
          city: nextProfile.player?.city || '',
          skillLevel: nextProfile.player?.skillLevel || 'beginner',
          avatarUrl: nextProfile.player?.avatarUrl || '',
        })
      } catch (error) {
        if (active) {
          pushToast({ type: 'error', title: 'Unable to load profile', message: error.message })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    if (auth.accessToken) {
      loadProfile()
    }

    return () => {
      active = false
    }
  }, [auth.accessToken, pushToast])

  const requestStatus = profile.user?.tournamentAdminRequest?.status || 'none'
  const alreadyAdmin = ['admin', 'super_admin', 'tournament_admin'].includes(profile.user?.role)
  const resolvePlayerName = (playerId, fallbackName) => {
    if (String(playerId || '') === String(profile.user?.playerId || profile.player?._id || '')) {
      return profile.player?.displayName || fallbackName || 'You'
    }
    return fallbackName || 'TBD'
  }

  const matchSummary = useMemo(() => myMatches.slice().sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()), [myMatches])

  if (!auth.accessToken) {
    return <Navigate to="/login" replace />
  }

  async function handleAccountSave(event) {
    event.preventDefault()
    setSavingAccount(true)
    try {
      const response = await userService.updateMe(accountForm)
      setProfile((current) => ({ ...current, user: response.data }))
      mergeAuth({ user: response.data })
      pushToast({ type: 'success', title: 'Account updated', message: 'Your account information has been saved.' })
    } catch (error) {
      pushToast({ type: 'error', title: 'Account update failed', message: error.message })
    } finally {
      setSavingAccount(false)
    }
  }

  async function handlePasswordSave(event) {
    event.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      pushToast({ type: 'warning', title: 'Password mismatch', message: 'Please confirm the new password correctly.' })
      return
    }

    setSavingPassword(true)
    try {
      await userService.changePassword(passwordForm)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      pushToast({ type: 'success', title: 'Password changed', message: 'Your password has been updated successfully.' })
    } catch (error) {
      pushToast({ type: 'error', title: 'Password change failed', message: error.message })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handlePlayerSave(event) {
    event.preventDefault()
    setSavingPlayer(true)
    try {
      const updatedPlayer = await playerService.updateMine(playerForm)
      setProfile((current) => ({ ...current, player: updatedPlayer }))
      pushToast({ type: 'success', title: 'Player profile updated', message: 'Your player information is now up to date.' })
    } catch (error) {
      pushToast({ type: 'error', title: 'Player profile update failed', message: error.message })
    } finally {
      setSavingPlayer(false)
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const avatarUrl = await resizeImageFileToDataUrl(file, { width: 512, height: 512, quality: 0.82 })
      setPlayerForm((current) => ({ ...current, avatarUrl }))
      pushToast({ type: 'info', title: 'Image ready', message: 'Avatar loaded. Save profile to keep it.' })
    } catch (error) {
      pushToast({ type: 'error', title: 'Image upload failed', message: error.message })
    }
  }

  async function handleTournamentAdminRequest() {
    setRequestingAdmin(true)
    try {
      const response = await userService.requestTournamentAdmin({ note: 'Requested from player profile page' })
      setProfile((current) => ({ ...current, user: response.data }))
      mergeAuth({ user: response.data })
      pushToast({ type: 'success', title: 'Request submitted', message: 'Tournament admin request has been sent for review.' })
    } catch (error) {
      pushToast({ type: 'error', title: 'Request failed', message: error.message })
    } finally {
      setRequestingAdmin(false)
    }
  }

  return (
    <section className="page-shell py-10">
      <SectionHeader
        eyebrow="My Account"
        title="Profile Settings"
        description="Manage account details, player profile, password, and follow only the matches that belong to you."
      />

      {loading ? <p className="text-sm text-slate-500">Loading profile...</p> : null}

      {!loading ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F172A] text-white">
                  <ShieldCheck className="h-5 w-5 text-[#EAB308]" />
                </div>
                <div>
                  <h2 className="display-title text-2xl text-[#0F172A]">Tournament Admin Request</h2>
                  <p className="text-sm text-slate-500">Current status: {requestStatus}</p>
                </div>
              </div>

              <button
                type="button"
                disabled={requestingAdmin || alreadyAdmin || requestStatus === 'pending'}
                onClick={handleTournamentAdminRequest}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#14213D] disabled:opacity-60"
              >
                <UserRoundCog className="h-4 w-4" />
                {alreadyAdmin
                  ? 'Admin Access Active'
                  : requestStatus === 'pending'
                    ? 'Request Pending'
                    : requestingAdmin
                      ? 'Submitting...'
                      : 'Register As Tournament Admin'}
              </button>
            </div>

            <form onSubmit={handleAccountSave} className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <h2 className="display-title text-2xl text-[#0F172A]">Account Information</h2>
              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Full Name</span>
                  <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={accountForm.fullName} onChange={(event) => setAccountForm((current) => ({ ...current, fullName: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Phone</span>
                  <input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={accountForm.phone} onChange={(event) => setAccountForm((current) => ({ ...current, phone: event.target.value }))} />
                </label>
              </div>
              <button type="submit" disabled={savingAccount} className="mt-5 rounded-2xl bg-[#EAB308] px-5 py-3 text-sm font-bold text-[#0F172A] disabled:opacity-60">
                {savingAccount ? 'Saving...' : 'Save Account'}
              </button>
            </form>

            <form onSubmit={handlePasswordSave} className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="display-title text-2xl text-[#0F172A]">Change Password</h2>
                  <p className="text-sm text-slate-500">Update your password after signing in.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Current Password</span>
                  <input type="password" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={passwordForm.oldPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, oldPassword: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">New Password</span>
                  <input type="password" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm New Password</span>
                  <input type="password" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
                </label>
              </div>

              <button type="submit" disabled={savingPassword} className="mt-5 rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {savingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <form onSubmit={handlePlayerSave} className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <h2 className="display-title text-2xl text-[#0F172A]">Player Profile</h2>
              <div className="mt-5 flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                {playerForm.avatarUrl ? (
                  <img src={playerForm.avatarUrl} alt="Profile avatar" className="h-20 w-20 rounded-3xl object-cover" />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#0F172A] text-2xl font-bold text-white">
                    {(playerForm.displayName || accountForm.fullName || 'P').slice(0, 1)}
                  </div>
                )}

                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">Profile Photo</p>
                  <p className="mt-1 text-sm text-slate-500">Upload avatar for your player profile.</p>
                </div>

                <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Display Name</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={playerForm.displayName} onChange={(event) => setPlayerForm((current) => ({ ...current, displayName: event.target.value }))} /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><input type="email" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={playerForm.email} onChange={(event) => setPlayerForm((current) => ({ ...current, email: event.target.value }))} /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Phone</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={playerForm.phone} onChange={(event) => setPlayerForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Skill Level</span><select className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={playerForm.skillLevel} onChange={(event) => setPlayerForm((current) => ({ ...current, skillLevel: event.target.value }))}>{SKILL_LEVEL_OPTIONS.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}</select></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Club</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={playerForm.club} onChange={(event) => setPlayerForm((current) => ({ ...current, club: event.target.value }))} /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">City</span><input className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3" value={playerForm.city} onChange={(event) => setPlayerForm((current) => ({ ...current, city: event.target.value }))} /></label>
              </div>

              <button type="submit" disabled={savingPlayer} className="mt-5 rounded-2xl bg-[#0F172A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {savingPlayer ? 'Saving...' : 'Save Player Profile'}
              </button>
            </form>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
              <h2 className="display-title text-2xl text-[#0F172A]">My Matches</h2>
              <p className="mt-2 text-sm text-slate-500">Only matches that include your player profile are listed here.</p>
              <div className="mt-6">
                <MatchResultsList matches={matchSummary} resolvePlayerName={resolvePlayerName} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default MyProfilePage
