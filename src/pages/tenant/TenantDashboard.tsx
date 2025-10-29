import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import StatCard from '../../components/ui/StatCard'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { CheckCircle, TrendingUp, AlertCircle, Play } from 'lucide-react'
import type { TenantDashboardStats, VerificationInitiateResponse } from '../../types'
import { useAppSelector } from '../../hooks/useRedux'

export default function TenantDashboard() {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const tenantId = user?.tenantId || user?.tenant_id

  const { data: stats, isLoading, error } = useQuery<TenantDashboardStats>({
    queryKey: ['tenant-dashboard'],
    queryFn: () => apiClient.get<TenantDashboardStats>(API_ENDPOINTS.TENANT_DASHBOARD),
  })


  // Initiate verification mutation
  const initiateVerificationMutation = useMutation({
    mutationFn: () =>
      apiClient.post<VerificationInitiateResponse>(API_ENDPOINTS.VERIFICATIONS_INITIATE, {
        templateId: '425',
        userEmail: user?.email || 'test@example.com',
        metadata: {
          testMode: true,
        },
      }),
    onSuccess: (response) => {
      const verificationId = response.verificationId || response.verification_id
      if (verificationId && tenantId) {
        // Navigate to validation page with verification ID
        navigate(`/tenant/validation/${verificationId}`, {
          state: { response },
        })
      }
    },
    onError: (error: any) => {
      alert(`Failed to initiate verification: ${error.message || 'Unknown error'}`)
    },
  })

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
        <p className="text-red-600 dark:text-red-400">
          Failed to load dashboard statistics
        </p>
      </div>
    )
  }

  const quotaPercentage = stats?.quota.limit 
    ? Math.round((stats.quota.used / stats.quota.limit) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tenant Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview of your verification activities
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => initiateVerificationMutation.mutate()}
          icon={<Play className="h-5 w-5" />}
          loading={initiateVerificationMutation.isPending}
        >
          Test Verification
        </Button>
      </div>

      {/* Quota Usage */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quota Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Used"
            value={stats?.quota.used || 0}
            icon={<TrendingUp />}
          />
          <StatCard
            title="Limit"
            value={stats?.quota.limit || 0}
            icon={<AlertCircle />}
          />
          <StatCard
            title="Remaining"
            value={stats?.quota.remaining || 0}
            description={`${quotaPercentage}% used`}
            icon={<TrendingUp />}
          />
        </div>
      </div>

      {/* Verification Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Verifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard
            title="Total"
            value={stats?.verifications.total || 0}
            icon={<CheckCircle />}
          />
          <StatCard
            title="Pending"
            value={stats?.verifications.pending || 0}
            icon={<CheckCircle />}
          />
          <StatCard
            title="Approved"
            value={stats?.verifications.approved || 0}
            icon={<CheckCircle />}
          />
          <StatCard
            title="Rejected"
            value={stats?.verifications.rejected || 0}
            icon={<CheckCircle />}
          />
          <StatCard
            title="Needs Review"
            value={stats?.verifications.needsReview || stats?.verifications.needs_review || 0}
            icon={<CheckCircle />}
          />
        </div>
      </div>

    </div>
  )
}

