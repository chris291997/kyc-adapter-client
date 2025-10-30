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
import { useEffect, useMemo, useState } from 'react'
import { TEMPLATES, PLAN_ID_TO_CARDS } from '../../constants/templates'

export default function TenantDashboard() {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const tenantId = user?.tenantId || user?.tenant_id

  // Template selection (must occur before initiate)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(() => {
    const saved = localStorage.getItem('tenant_dash_selected_template')
    return saved ? Number(saved) : 425
  })

  useEffect(() => {
    localStorage.setItem('tenant_dash_selected_template', String(selectedTemplateId))
  }, [selectedTemplateId])

  const allowedCards = useMemo(() => {
    const tpl = TEMPLATES.find(t => t.id === selectedTemplateId)
    if (!tpl) return new Set<string>()
    const cards = tpl.dropzone_plans.flatMap((pid) => PLAN_ID_TO_CARDS[pid] || [])
    return new Set(cards)
  }, [selectedTemplateId])

  const { data: stats, isLoading, error } = useQuery<TenantDashboardStats>({
    queryKey: ['tenant-dashboard'],
    queryFn: () => apiClient.get<TenantDashboardStats>(API_ENDPOINTS.TENANT_DASHBOARD),
  })


  // Initiate verification mutation
  const initiateVerificationMutation = useMutation({
    mutationFn: () =>
      apiClient.post<VerificationInitiateResponse>(API_ENDPOINTS.VERIFICATIONS_INITIATE, {
        templateId: String(selectedTemplateId),
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
          state: { response, selectedTemplateId },
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
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name} (ID: {t.id})</option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Steps: {Array.from(allowedCards).join(', ') || 'None'}
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => initiateVerificationMutation.mutate()}
            icon={<Play className="h-5 w-5" />}
            loading={initiateVerificationMutation.isPending}
          >
            Start Verification
          </Button>
        </div>
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

