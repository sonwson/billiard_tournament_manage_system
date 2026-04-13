import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute'
import AdminLayout from './components/layout/AdminLayout'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminMatchesPage from './pages/AdminMatchesPage'
import AdminPlayersPage from './pages/AdminPlayersPage'
import AdminRegistrationsPage from './pages/AdminRegistrationsPage'
import AdminRequestsPage from './pages/AdminRequestsPage'
import AdminTournamentsPage from './pages/AdminTournamentsPage'
import MainLayout from './components/layout/MainLayout'
import ToastViewport from './components/ui/ToastViewport'
import EventDetailPage from './pages/EventDetailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import EventsPage from './pages/EventsPage'
import LoginPage from './pages/LoginPage'
import MatchesPage from './pages/MatchesPage'
import MyProfilePage from './pages/MyProfilePage'
import PlayersPage from './pages/PlayersPage'
import RankingsPage from './pages/RankingsPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ScoreEntryPage from './pages/ScoreEntryPage'

function App() {
  return (
    <>
      <ToastViewport />
      <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/me" element={<MyProfilePage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route
          path="/admin"
          element={(
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          )}
        >
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="tournaments" element={<AdminTournamentsPage />} />
          <Route path="registrations" element={<AdminRegistrationsPage />} />
          <Route path="matches" element={<AdminMatchesPage />} />
          <Route path="players" element={<AdminPlayersPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/score-entry/:token" element={<ScoreEntryPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App
