import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from './hooks/useRedux'
import { ThemeProvider } from './contexts/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminLayout from './components/layouts/AdminLayout'
import TenantLayout from './components/layouts/TenantLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import TenantManagement from './pages/admin/TenantManagement'
import TenantDetails from './pages/admin/TenantDetails'
import ValidationPage from './pages/admin/ValidationPage'
import ProviderManagement from './pages/admin/ProviderManagement'
import UsersManagement from './pages/admin/UsersManagement'
import TenantDashboard from './pages/tenant/TenantDashboard'
import TenantValidationPage from './pages/tenant/ValidationPage'
import VerificationsList from './pages/tenant/VerificationsList'
import AccountsList from './pages/tenant/AccountsList'
import ApiKeysPage from './pages/tenant/ApiKeysPage'
import NotFoundPage from './pages/NotFoundPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import { websocketService } from './services/websocketService'

function App() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // Apply theme class on mount
    const theme = localStorage.getItem('theme')
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme')
    }
  }, [])

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to WebSocket
      websocketService.connect()

      // Cleanup on unmount or logout
      return () => {
        websocketService.disconnect()
      }
    } else {
      // Disconnect if not authenticated
      websocketService.disconnect()
    }
  }, [isAuthenticated, user])

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardRoute(user)} replace />
            ) : (
              <LoginPage />
            )
          } 
        />

        {/* Super Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredUserType="super_admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="tenants" element={<TenantManagement />} />
          <Route path="tenants/:tenantId" element={<TenantDetails />} />
          <Route path="tenants/:tenantId/validation/:verificationId" element={<ValidationPage />} />
          <Route path="providers" element={<ProviderManagement />} />
          <Route path="users" element={<UsersManagement />} />
        </Route>

        {/* Tenant Admin & User Routes */}
        <Route
          path="/tenant/*"
          element={
            <ProtectedRoute requiredUserType={['tenant_admin', 'tenant_user']}>
              <TenantLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/tenant/dashboard" replace />} />
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="validation/:verificationId" element={<TenantValidationPage />} />
          <Route path="verifications" element={<VerificationsList />} />
          <Route path="accounts" element={<AccountsList />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
        </Route>

        {/* Default Route */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardRoute(user)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Error Routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ThemeProvider>
    </ErrorBoundary>
  )
}

function getDashboardRoute(user?: any) {
  const userType = user?.userType || user?.user_type
  switch (userType) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'tenant_admin':
    case 'tenant_user':
      return '/tenant/dashboard'
    default:
      return '/login'
  }
}

export default App

