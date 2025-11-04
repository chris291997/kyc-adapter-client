import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal, { ModalActions } from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { Plus, CheckCircle, ExternalLink, Eye, RefreshCw } from 'lucide-react'
import { formatDate, capitalize } from '../../utils/format'
import { websocketService } from '../../services/websocketService'
import { WS_EVENTS } from '../../constants'
import type { Verification, PaginatedResponse, VerificationInitiateRequest } from '../../types'

export default function VerificationsList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [showInitiateModal, setShowInitiateModal] = useState(false)
  const [formData, setFormData] = useState<Omit<VerificationInitiateRequest, 'verificationType'>>({
    userEmail: '',
    userPhone: '',
    metadata: {
      firstName: '',
      lastName: '',
      testMode: true,
    },
  })

  const { data, isLoading, error, refetch, isRefetching } = useQuery<PaginatedResponse<Verification>>({
    queryKey: ['tenant-verifications', page, limit],
    queryFn: () => apiClient.get<PaginatedResponse<Verification>>(`${API_ENDPOINTS.TENANT_VERIFICATIONS}?page=${page}&limit=${limit}`),
    refetchOnMount: false, // Use cached data when navigating back, don't refetch if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes (cached data from websocket refetch is valid)
  })

  useEffect(() => {
    // Connect to WebSocket for real-time updates if not already connected
    if (!websocketService.isConnected()) {
      websocketService.connect()
    }

    // Subscribe to general verification updates
    const unsubscribe1 = websocketService.on(WS_EVENTS.VERIFICATION_STATUS_UPDATE, () => {
      refetch()
    })

    const unsubscribe2 = websocketService.on(WS_EVENTS.VERIFICATION_COMPLETED, () => {
      refetch()
    })

    return () => {
      unsubscribe1()
      unsubscribe2()
    }
  }, [refetch])

  const handleInitiateVerification = async () => {
    try {
      const response = await apiClient.post<any>(API_ENDPOINTS.VERIFICATIONS_INITIATE, formData)
      
      // Ensure WebSocket is connected before subscribing
      if (!websocketService.isConnected()) {
        websocketService.connect()
        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Subscribe to WebSocket updates for this verification
      const verificationId = response.verificationId || response.verification_id
      if (verificationId) {
        console.log(`🔔 Subscribing to verification: ${verificationId}`)
        websocketService.subscribeToVerification(verificationId, (data) => {
          console.log(`📨 Verification update received for ${verificationId}:`, data)
          refetch()
        })
        console.log(`✅ Successfully subscribed to verification: ${verificationId}`)

        // Navigate to validation page to view the verification
        navigate(`/tenant/validation/${verificationId}`, {
          state: { response }
        })

        // Open session URL if present
        const sessionUrl = response.sessionUrl || response.session_url
        if (sessionUrl) {
          window.open(sessionUrl, '_blank')
        }
      }

      setShowInitiateModal(false)
      setFormData({
        userEmail: '',
        userPhone: '',
        metadata: {
          firstName: '',
          lastName: '',
          testMode: true,
        },
      })
      refetch()
    } catch (err) {
      console.error('Failed to initiate verification:', err)
      alert('Failed to initiate verification')
    }
  }

  const handleViewVerification = (verification: Verification) => {
    const verificationId = verification.verificationId || verification.verification_id || verification.id
    if (verificationId) {
      navigate(`/tenant/validation/${verificationId}`)
    }
  }

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
        <p className="text-red-600 dark:text-red-400">Failed to load verifications</p>
      </div>
    )
  }

  const verifications = data?.data || []
  
  // Extract pagination info from root level (not nested)
  const pagination = data ? {
    page: data.page || 1,
    limit: data.limit || 10,
    total: data.total || verifications.length,
    totalPages: data.totalPages || Math.ceil((data.total || verifications.length) / (data.limit || 10))
  } : null


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage verification requests
          </p>
        </div>
        <Button 
          icon={<Plus className="h-5 w-5" />}
          onClick={() => setShowInitiateModal(true)}
        >
          Initiate Verification
        </Button>
      </div>

      <Card>
        {verifications.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="h-12 w-12 text-gray-400" />}
            title="No verifications found"
            description="Start your first verification to get started"
            action={
              <Button 
                icon={<Plus className="h-5 w-5" />}
                onClick={() => setShowInitiateModal(true)}
              >
                Initiate Verification
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Verification ID</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>User</TableHeader>
                  <TableHeader>Provider</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Created</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {verifications.map((verification) => (
                  <TableRow key={verification.id}>
                    <TableCell>
                      <div className="font-mono text-xs">
                        {(() => {
                          const id = verification.verificationId || verification.verification_id || verification.id || ''
                          return id ? `${id.substring(0, 16)}...` : 'N/A'
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{capitalize((verification as any).verificationType || (verification as any).verification_type || 'N/A')}</Badge>
                    </TableCell>
                    <TableCell>{verification.userEmail || 'N/A'}</TableCell>
                    <TableCell>
                      {!verification.provider 
                        ? 'N/A'
                        : typeof verification.provider === 'string' 
                        ? verification.provider 
                        : (verification.provider as any)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        // Extract status from provider_response.fullResponse.status if available
                        const prov = (verification as any)?.provider_response
                        const statusFromProvider = prov?.fullResponse?.status
                        let displayStatus = verification.status
                        const isFinalized = (verification as any)?.finalized
                        
                        if (statusFromProvider !== undefined && statusFromProvider !== null) {
                          // Convert boolean status to string if needed
                          if (typeof statusFromProvider === 'boolean') {
                            displayStatus = statusFromProvider ? 'approved' : 'rejected'
                          } else {
                            const statusStr = String(statusFromProvider)
                            // Only use if it's a valid VerificationStatus
                            if (['pending', 'processing', 'approved', 'rejected', 'expired', 'needs_review'].includes(statusStr.toLowerCase())) {
                              displayStatus = statusStr.toLowerCase() as any
                            }
                          }
                        }
                        
                        return (
                          <div className="flex items-center gap-2">
                            <Badge variant={displayStatus as any}>
                              {displayStatus}
                            </Badge>
                            {isFinalized && (
                              <span className="text-xs text-green-600 dark:text-green-400" title="Verification Finalized">
                                ✅
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      {formatDate(verification.createdAt || verification.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewVerification(verification)}
                          icon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                        {(verification.sessionUrl || verification.session_url) && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => window.open((verification.sessionUrl || verification.session_url)!, '_blank')}
                            icon={<ExternalLink className="h-4 w-4" />}
                          >
                            Open
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {verifications.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pagination ? (
                    <>
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </>
                  ) : (
                    `Showing ${verifications.length} result${verifications.length !== 1 ? 's' : ''}`
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    icon={<RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />}
                    title="Refresh list"
                  >
                    {isRefetching ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  {pagination && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(1)}
                        disabled={pagination.page === 1}
                      >
                        First
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const totalPages = pagination.totalPages || Math.ceil(pagination.total / pagination.limit)
                          const currentPage = pagination.page
                          const pages: (number | string)[] = []
                      
                      if (totalPages <= 7) {
                        // Show all pages if 7 or fewer
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i)
                        }
                      } else {
                        // Always show first page
                        pages.push(1)
                        
                        if (currentPage <= 3) {
                          // Show pages 1-4
                          for (let i = 2; i <= 4; i++) pages.push(i)
                          pages.push('...')
                          pages.push(totalPages)
                        } else if (currentPage >= totalPages - 2) {
                          // Show pages near the end
                          pages.push('...')
                          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
                        } else {
                          // Show pages around current
                          pages.push('...')
                          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
                          pages.push('...')
                          pages.push(totalPages)
                        }
                      }
                      
                      return pages.map((pageNum, idx) => {
                        if (pageNum === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-2 text-gray-600 dark:text-gray-400">
                              ...
                            </span>
                          )
                        }
                        
                        const isActive = pageNum === currentPage
                        return (
                          <Button
                            key={pageNum}
                            size="sm"
                            variant={isActive ? 'primary' : 'ghost'}
                            onClick={() => setPage(pageNum as number)}
                            className="min-w-[2rem]"
                          >
                            {pageNum}
                          </Button>
                        )
                      })
                    })()}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={pagination.page >= (pagination.totalPages || Math.ceil(pagination.total / pagination.limit))}
                      >
                        Next
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage(pagination.totalPages || Math.ceil(pagination.total / pagination.limit))}
                        disabled={pagination.page >= (pagination.totalPages || Math.ceil(pagination.total / pagination.limit))}
                      >
                        Last
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Initiate Verification Modal */}
      <Modal
        isOpen={showInitiateModal}
        onClose={() => setShowInitiateModal(false)}
        title="Initiate Verification"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.metadata?.firstName || ''}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, firstName: e.target.value }
              })}
              required
            />
            <Input
              label="Last Name"
              value={formData.metadata?.lastName || ''}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, lastName: e.target.value }
              })}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.userEmail}
            onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
            required
          />

          <Input
            label="Phone (optional)"
            type="tel"
            value={formData.userPhone || ''}
            onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="testMode"
              checked={formData.metadata?.testMode || false}
              onChange={(e) => setFormData({
                ...formData,
                metadata: { ...formData.metadata, testMode: e.target.checked }
              })}
              className="rounded border-gray-300"
            />
            <label htmlFor="testMode" className="text-sm text-gray-700 dark:text-gray-300">
              Test Mode
            </label>
          </div>
        </div>

        <ModalActions>
          <Button variant="ghost" onClick={() => setShowInitiateModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleInitiateVerification}>
            Initiate
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}

