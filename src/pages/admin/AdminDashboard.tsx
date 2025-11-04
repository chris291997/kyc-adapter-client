import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Building2, Users, Shield, CheckCircle } from 'lucide-react'
import type { SuperAdminDashboardStats } from '../../types'

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<SuperAdminDashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      try {
        const result = await apiClient.get<SuperAdminDashboardStats>(API_ENDPOINTS.ADMIN_DASHBOARD)
        console.log('Dashboard data:', result)
        return result
      } catch (err) {
        console.error('Dashboard error:', err)
        throw err
      }
    },
    retry: 1,
    staleTime: 30000,
  })

  console.log('Dashboard state:', { isLoading, error: error?.toString(), hasData: !!stats })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
          Failed to load dashboard statistics
        </p>
        <p className="text-sm text-red-500 dark:text-red-300">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-600 dark:text-yellow-400">
          No dashboard data available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          System Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Overview of all tenants, users, and verifications
        </p>
      </div>

      {/* Tenant Stats */}
      {stats.tenants && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Tenants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Tenants"
              value={stats.tenants?.total || 0}
              icon={<Building2 />}
            />
            <StatCard
              title="Active Tenants"
              value={stats.tenants?.active || 0}
              icon={<Building2 />}
            />
            <StatCard
              title="Suspended Tenants"
              value={stats.tenants?.suspended || 0}
              icon={<Building2 />}
            />
          </div>
        </div>
      )}

      {/* User Stats */}
      {stats.users && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Users
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Users"
              value={stats.users?.total || 0}
              icon={<Users />}
            />
            <StatCard
              title="Super Admins"
              value={stats.users?.superAdmins || stats.users?.super_admins || 0}
              icon={<Shield />}
            />
            <StatCard
              title="Tenant Admins"
              value={stats.users?.tenantAdmins || stats.users?.tenant_admins || 0}
              icon={<Users />}
            />
            <StatCard
              title="Tenant Users"
              value={stats.users?.tenantUsers || stats.users?.tenant_users || 0}
              icon={<Users />}
            />
          </div>
        </div>
      )}

      {/* Verification Stats */}
      {stats.verifications && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Verifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <StatCard
              title="Total Verifications"
              value={stats.verifications?.total || 0}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Pending"
              value={stats.verifications?.pending || 0}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Verified"
              value={stats.verifications?.verified || 0}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Rejected"
              value={stats.verifications?.rejected || 0}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Needs Review"
              value={stats.verifications?.needsReview || stats.verifications?.needs_review || 0}
              icon={<CheckCircle />}
            />
          </div>
        </div>
      )}

      {/* Provider Stats */}
      {stats.providers && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Providers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="Total Providers"
              value={stats.providers?.total || 0}
              icon={<Shield />}
            />
            <StatCard
              title="Active Providers"
              value={stats.providers?.active || 0}
              icon={<Shield />}
            />
          </div>
        </div>
      )}

      {/* Debug Info - Remove after fixing */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
            Debug: API Response Structure
          </summary>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(stats, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}

