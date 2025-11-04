import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS, API_BASE_URL } from '../../constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { ArrowLeft, UserCircle, CheckCircle, Image as ImageIcon } from 'lucide-react'
import { formatDate } from '../../utils/format'
import type { Verification } from '../../types'

// Status code map
const STATUS_CODE_MAP: Record<number, string> = {
  1: 'Rejected',
  2: 'Review Needed',
  3: 'Verified',
  4: 'Incomplete',
  5: 'In Progress',
  6: 'Failed',
  7: 'Purged',
}

// Helper to get image URL
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url}`
}

// Helper to get status badge variant
const getStatusVariant = (status: string | number | boolean | undefined): 'pending' | 'approved' | 'rejected' | 'verified' => {
  if (typeof status === 'boolean') {
    return status ? 'approved' : 'rejected'
  }
  if (typeof status === 'number') {
    const statusMap: Record<number, 'pending' | 'approved' | 'rejected' | 'verified'> = {
      1: 'rejected',
      2: 'pending',
      3: 'verified',
      4: 'pending',
      5: 'pending',
      6: 'rejected',
      7: 'rejected',
    }
    return statusMap[status] || 'pending'
  }
  if (typeof status === 'string') {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus === 'verified' || lowerStatus === 'approved') return 'verified'
    if (lowerStatus === 'rejected' || lowerStatus === 'failed') return 'rejected'
    return 'pending'
  }
  return 'pending'
}

// Helper to get status display text
const getStatusText = (status: string | number | boolean | undefined, statusMessage?: string): string => {
  if (statusMessage) return statusMessage
  if (typeof status === 'boolean') {
    return status ? 'Verified' : 'Rejected'
  }
  if (typeof status === 'number') {
    return STATUS_CODE_MAP[status] || `Status ${status}`
  }
  if (typeof status === 'string') {
    return status.toUpperCase()
  }
  return 'Unknown'
}

export default function AccountDetails() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()

  // Fetch account details
  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => apiClient.get<any>(`${API_ENDPOINTS.ACCOUNTS}/${accountId}`),
    enabled: !!accountId,
  })

  // Fetch verifications for this account
  const { data: verificationsData, isLoading: isLoadingVerifications } = useQuery<{ data: Verification[] }>({
    queryKey: ['account-verifications', accountId],
    queryFn: () => apiClient.get<{ data: Verification[] }>(`${API_ENDPOINTS.ACCOUNTS}/${accountId}/verifications`),
    enabled: !!accountId,
  })

  const verifications = verificationsData?.data || []

  // Get account name from verified_data or account data
  const accountName = account?.verified_data?.fullResponse?.verification?.profile_name || 
                      account?.name || 
                      'Unknown Account'

  // Get account reference ID
  const accountReferenceId = account?.verified_data?.externalVerificationId || 
                             account?.reference_id || 
                             'N/A'

  if (isLoadingAccount || isLoadingVerifications) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/tenant/accounts')}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Accounts
        </Button>
        <EmptyState
          icon={<UserCircle className="h-12 w-12 text-gray-400" />}
          title="Account not found"
          description="The account you're looking for doesn't exist or has been removed."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/tenant/accounts')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Account Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {accountName}
            </p>
          </div>
        </div>
      </div>

      {/* Account Info Card */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Profile Name</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {accountName}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Reference ID</label>
            <p className="text-lg font-mono text-sm text-gray-900 dark:text-gray-100 mt-1">
              {accountReferenceId}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</label>
            <div className="mt-1">
              <Badge variant={getStatusVariant(account.verification_status)}>
                {account.verification_status}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Account ID</label>
            <p className="text-lg font-mono text-sm text-gray-900 dark:text-gray-100 mt-1">
              {account.id}
            </p>
          </div>
          {account.createdAt || account.created_at && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</label>
              <p className="text-lg text-gray-900 dark:text-gray-100 mt-1">
                {formatDate(account.createdAt || account.created_at)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Verifications Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Verifications ({verifications.length})
        </h2>

        {verifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={<CheckCircle className="h-12 w-12 text-gray-400" />}
              title="No verifications found"
              description="This account hasn't completed any verifications yet."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {verifications.map((verification: any) => {
              // Get verification status
              const status = verification.provider_response?.fullResponse?.status || 
                           verification.provider_response?.status_message ||
                           verification.status
              const statusMessage = verification.provider_response?.fullResponse?.status_message ||
                                  verification.provider_response?.status_message ||
                                  (typeof status === 'number' ? STATUS_CODE_MAP[status] : String(status))

              // Get verification types
              const verificationTypes = verification.verification_types || []
              
              // Get provider info
              const providerName = typeof verification.provider === 'object' && verification.provider?.name 
                ? verification.provider.name 
                : 'Unknown Provider'
              
              // Get images from metadata
              const verificationSteps = verification.metadata?.verification_steps || {}
              const images: Array<{ stepType: string; imageKey: string; url: string; label: string }> = []

              // Extract images from verification steps
              Object.entries(verificationSteps).forEach(([stepType, stepData]: [string, any]) => {
                if (stepData.images) {
                  // Multiple images (e.g., face match with image1, image2)
                  Object.entries(stepData.images).forEach(([imageKey, image]: [string, any]) => {
                    if (image?.url) {
                      images.push({
                        stepType,
                        imageKey,
                        url: image.url,
                        label: `${stepType.replace(/_/g, ' ')} - ${imageKey}`,
                      })
                    }
                  })
                } else if (stepData.image?.url) {
                  // Single image (e.g., biometric verification)
                  images.push({
                    stepType,
                    imageKey: 'image',
                    url: stepData.image.url,
                    label: stepType.replace(/_/g, ' '),
                  })
                } else if (stepData.document?.url) {
                  // Document image
                  images.push({
                    stepType,
                    imageKey: 'document',
                    url: stepData.document.url,
                    label: `${stepType.replace(/_/g, ' ')} - Document`,
                  })
                }
              })

              return (
                <Card key={verification.id}>
                  <div className="space-y-4">
                    {/* Verification Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Verification #{verification.id.slice(0, 8)}
                          </h3>
                          <Badge variant={getStatusVariant(status)}>
                            {getStatusText(status, statusMessage)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {verificationTypes.map((type: string) => (
                            <Badge key={type} variant="pending" className="text-xs">
                              {type.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/tenant/validation/${verification.id}`)}
                      >
                        View Details
                      </Button>
                    </div>

                    {/* Verification Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Provider</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{providerName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">External Verification ID</label>
                        <p className="text-sm font-mono text-xs text-gray-900 dark:text-gray-100 mt-1">
                          {verification.external_verification_id || verification.externalVerificationId || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed At</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                          {verification.provider_response?.fullResponse?.verification?.verification_ended_at
                            ? formatDate(verification.provider_response.fullResponse.verification.verification_ended_at)
                            : verification.updated_at || verification.updatedAt
                            ? formatDate(verification.updated_at || verification.updatedAt)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Profile Name from Verification */}
                    {verification.provider_response?.fullResponse?.verification?.profile_name && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Verified Profile Name</label>
                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                          {verification.provider_response.fullResponse.verification.profile_name}
                        </p>
                      </div>
                    )}

                    {/* Verification Images */}
                    {images.length > 0 && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <ImageIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Verification Images ({images.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {images.map((img, idx) => (
                            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                              <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <img
                                  src={getImageUrl(img.url)}
                                  alt={img.label}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E'
                                  }}
                                />
                              </div>
                              <div className="p-2 bg-gray-50 dark:bg-gray-900">
                                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 capitalize">
                                  {img.label}
                                </p>
                                {verificationSteps[img.stepType]?.completedAt && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDate(verificationSteps[img.stepType].completedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Metrics */}
                    {((verification.metadata as any)?.score || (verification.metadata as any)?.probability || (verification as any)?.confidence_score) && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {(verification.metadata as any)?.score && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Score</label>
                              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                {(verification.metadata as any).score}
                              </p>
                            </div>
                          )}
                          {(verification.metadata as any)?.probability && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Probability</label>
                              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                {((verification.metadata as any).probability * 100).toFixed(2)}%
                              </p>
                            </div>
                          )}
                          {(verification as any)?.confidence_score && (
                            <div>
                              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Confidence Score</label>
                              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                                {(verification as any).confidence_score}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

