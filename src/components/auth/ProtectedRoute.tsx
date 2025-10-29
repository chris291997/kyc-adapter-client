import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../../hooks/useRedux'
import LoadingSpinner from '../ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
  requiredUserType?: string | string[]
}

export default function ProtectedRoute({ children, requiredUserType }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAppSelector((state) => state.auth)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredUserType) {
    const allowedTypes = Array.isArray(requiredUserType) ? requiredUserType : [requiredUserType]
    const userType = user?.userType || user?.user_type
    if (user && userType && !allowedTypes.includes(userType as any)) {
      return <Navigate to="/unauthorized" replace />
    }
    
    if (user && !userType) {
      console.error('User has no userType:', user)
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}

