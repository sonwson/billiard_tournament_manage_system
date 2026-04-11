import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'

function ProtectedAdminRoute({ children }) {
  const auth = useAppStore((state) => state.auth)
  const location = useLocation()

  if (!auth.accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!auth.isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedAdminRoute
