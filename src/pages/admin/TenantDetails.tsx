import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatCard from '../../components/ui/StatCard'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import EmptyState from '../../components/ui/EmptyState'
import Tabs from '../../components/ui/Tabs'
import Modal, { ModalActions } from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { ArrowLeft, Edit, Users, CheckCircle, Building2, AlertCircle, Play, Eye, Copy } from 'lucide-react'
import { formatDate, capitalize } from '../../utils/format'
import type { Tenant, VerificationInitiateResponse, Verification, PaginatedResponse, Account } from '../../types'
import TenantProviderAssignment from '../../components/admin/TenantProviderAssignment'

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  alert('Copied to clipboard!')
}

interface TenantStats {
  users: {
    total: number
    admins: number
    regularUsers: number
  }
  verifications: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  quota: {
    used: number
    limit: number
    percentage: number
  }
}

export default function TenantDetails() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: tenant, isLoading, error } = useQuery<Tenant>({
    queryKey: ['tenant', tenantId],
    queryFn: () => apiClient.get<Tenant>(`${API_ENDPOINTS.ADMIN_TENANTS}/${tenantId}`),
    enabled: !!tenantId,
  })

  // Note: Stats endpoint doesn't exist yet, using data from verifications and accounts
  // const { data: stats } = useQuery<TenantStats>({
  //   queryKey: ['tenant-stats', tenantId],
  //   queryFn: () => apiClient.get<TenantStats>(`${API_ENDPOINTS.ADMIN_TENANTS}/${tenantId}/stats`),
  //   enabled: !!tenantId,
  // })

  const [verificationsPage, setVerificationsPage] = useState(1)
  const verificationsLimit = 10
  
  const [accountsPage, setAccountsPage] = useState(1)
  const accountsLimit = 10
  
  // View account modal state
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showAccountModal, setShowAccountModal] = useState(false)
  
  // Edit tenant modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    quota_limit: 0,
  })

  // Fetch tenant verifications
  const { data: verificationsData, isLoading: verificationsLoading } = useQuery<PaginatedResponse<Verification>>({
    queryKey: ['tenant-verifications', tenantId, verificationsPage],
    queryFn: async () => {
      // Use admin endpoint with tenant filter if available, otherwise use tenant endpoint
      try {
        return await apiClient.get<PaginatedResponse<Verification>>(`${API_ENDPOINTS.TENANT_VERIFICATIONS}?page=${verificationsPage}&limit=${verificationsLimit}`)
      } catch (error) {
        console.error('Failed to fetch verifications:', error)
        return { data: [], page: 1, limit: 10, total: 0, totalPages: 0 }
      }
    },
    enabled: !!tenantId,
  })

  // Fetch validated users (accounts)
  const { data: accountsData, isLoading: accountsLoading } = useQuery<PaginatedResponse<Account>>({
    queryKey: ['tenant-accounts', tenantId, accountsPage],
    queryFn: async () => {
      // Use accounts endpoint - filter by tenantId in the response
      try {
        return await apiClient.get<PaginatedResponse<Account>>(`${API_ENDPOINTS.ACCOUNTS}?page=${accountsPage}&limit=${accountsLimit}`)
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
        return { data: [], page: 1, limit: 10, total: 0, totalPages: 0 }
      }
    },
    enabled: !!tenantId,
  })

  const verifications = verificationsData?.data || []
  const verificationsPagination = verificationsData ? {
    page: verificationsData.page || 1,
    limit: verificationsData.limit || 10,
    total: verificationsData.total || verifications.length,
    totalPages: verificationsData.totalPages || Math.ceil((verificationsData.total || verifications.length) / (verificationsData.limit || 10))
  } : null
  
  const accounts = accountsData?.data || []
  const accountsPagination = accountsData ? {
    page: accountsData.page || 1,
    limit: accountsData.limit || 10,
    total: accountsData.total || accounts.length,
    totalPages: accountsData.totalPages || Math.ceil((accountsData.total || accounts.length) / (accountsData.limit || 10))
  } : null

  const handleViewVerification = (verification: Verification) => {
    const verificationId = verification.verificationId || verification.verification_id || verification.id
    if (verificationId && tenantId) {
      // Pass the verification data to the validation page
      navigate(`/admin/tenants/${tenantId}/validation/${verificationId}`, {
        state: { 
          response: {
            verificationId: verificationId,
            verification_id: verificationId,
            status: verification.status,
            verificationType: (verification as any).verificationType || (verification as any).verification_type,
            sessionUrl: verification.sessionUrl || verification.session_url,
            session_url: verification.sessionUrl || verification.session_url,
            result: verification.result,
          }
        }
      })
    }
  }

  const handleViewAccount = (account: Account) => {
    setSelectedAccount(account)
    setShowAccountModal(true)
  }

  const handleEdit = () => {
    setEditFormData({
      name: tenant?.name || '',
      email: tenant?.email || '',
      quota_limit: tenant?.quota_limit || 0,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    updateTenantMutation.mutate({
      id: tenant?.id || '',
      data: editFormData,
    })
  }

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      // Try both PATCH and PUT to match backend requirements
      console.log('Updating tenant:', id, data)
      return apiClient.put<Tenant>(`${API_ENDPOINTS.ADMIN_TENANTS}/${id}`, data)
    },
    onSuccess: () => {
      setShowEditModal(false)
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      alert('Tenant updated successfully')
    },
    onError: (error: any) => {
      console.error('Update tenant error:', error)
      alert(`Failed to update tenant: ${error.message || 'Unknown error'}`)
    },
  })

  // Initiate verification mutation
  const initiateVerificationMutation = useMutation({
    mutationFn: () =>
      apiClient.post<VerificationInitiateResponse>(API_ENDPOINTS.VERIFICATIONS_INITIATE, {
        templateId: '950',
        userEmail: `test@${tenant?.name?.toLowerCase().replace(/\s+/g, '')}.com` || 'test@example.com',
        metadata: {
          testMode: true,
        },
      }),
    onSuccess: (response) => {
      const verificationId = response.verificationId || response.verification_id
      if (verificationId) {
        // Navigate to validation page with verification ID
        navigate(`/admin/tenants/${tenantId}/validation/${verificationId}`, {
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

  if (error || !tenant) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/tenants')}
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Tenants
        </Button>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">Failed to load tenant details</p>
        </div>
      </div>
    )
  }

  const quotaPercentage = tenant.quota_limit > 0 
    ? Math.round((tenant.quota_used / tenant.quota_limit) * 100) 
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/tenants')}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {tenant.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Tenant Details and Statistics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => initiateVerificationMutation.mutate()}
            icon={<Play className="h-5 w-5" />}
            loading={initiateVerificationMutation.isPending}
          >
            Test Verification
          </Button>
          <Button
            variant="primary"
            onClick={handleEdit}
            icon={<Edit className="h-5 w-5" />}
          >
            Edit Tenant
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Tenant ID
              </label>
              <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {tenant.id}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Name
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {tenant.name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Email
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {tenant.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <Badge variant={tenant.status}>{tenant.status}</Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Created At
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {formatDate(tenant.createdAt || tenant.created_at)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Last Updated
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {formatDate(tenant.updatedAt || tenant.updated_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Statistics Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Overview Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Verifications"
              value={verificationsData?.total || 0}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Validated Users"
              value={accountsData?.total || 0}
              icon={<Users />}
            />
            <StatCard
              title="Quota Used"
              value={tenant.quota_used}
              description={`of ${tenant.quota_limit}`}
              icon={<AlertCircle />}
            />
            <StatCard
              title="Status"
              value={tenant.status}
              icon={<Building2 />}
            />
          </div>
        </CardContent>
      </Card>

      {verifications.length > 0 && (
          <Card>
            <CardHeader>
            <CardTitle>Verification Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                title="Pending"
                value={verifications.filter(v => v.status === 'pending').length}
                icon={<AlertCircle />}
                />
                <StatCard
                title="Approved"
                value={verifications.filter(v => v.status === 'approved').length}
                  icon={<CheckCircle />}
                />
                <StatCard
                title="Processing"
                value={verifications.filter(v => v.status === 'processing').length}
                  icon={<CheckCircle />}
                />
                <StatCard
                  title="Rejected"
                value={verifications.filter(v => v.status === 'rejected').length}
                icon={<AlertCircle />}
                />
              </div>
            </CardContent>
          </Card>
      )}

      {/* Tabs */}
      <Card>
        <CardContent>
          <Tabs
            tabs={[
              {
                id: 'providers',
                label: 'Provider Assignments',
                content: tenantId && <TenantProviderAssignment tenantId={tenantId} />
              },
              {
                id: 'verifications',
                label: 'Recent Verifications',
                content: (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Verifications</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/tenants/${tenantId}/verifications`)}
                      >
                        View All
                      </Button>
                    </div>
                    {verificationsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <LoadingSpinner />
                      </div>
                    ) : verifications.length === 0 ? (
                      <EmptyState
                        icon={<CheckCircle className="h-12 w-12 text-gray-400" />}
                        title="No verifications yet"
                        description="This tenant hasn't initiated any verifications"
                      />
                    ) : (
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>Verification ID</TableHeader>
                            <TableHeader>Type</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Created</TableHeader>
                            <TableHeader>Actions</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {verifications.slice(0, 5).map((verification) => (
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
                              <TableCell>
                                <Badge variant={verification.status as any}>
                                  {verification.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatDate(verification.createdAt || verification.created_at)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewVerification(verification)}
                                  icon={<Eye className="h-4 w-4" />}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    
                    {/* Verifications Pagination */}
                    {verificationsPagination && verifications.length > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {((verificationsPagination.page - 1) * verificationsPagination.limit) + 1} to{' '}
                          {Math.min(verificationsPagination.page * verificationsPagination.limit, verificationsPagination.total)} of{' '}
                          {verificationsPagination.total} results
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVerificationsPage(1)}
                            disabled={verificationsPagination.page === 1}
                          >
                            First
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVerificationsPage(p => Math.max(1, p - 1))}
                            disabled={verificationsPagination.page === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                            Page {verificationsPagination.page} of {verificationsPagination.totalPages}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVerificationsPage(p => p + 1)}
                            disabled={verificationsPagination.page >= verificationsPagination.totalPages}
                          >
                            Next
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVerificationsPage(verificationsPagination.totalPages)}
                            disabled={verificationsPagination.page >= verificationsPagination.totalPages}
                          >
                            Last
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              },
              {
                id: 'users',
                label: 'Validated Users',
                content: (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Validated Users</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/tenants/${tenantId}/accounts`)}
                      >
                        View All
                      </Button>
                    </div>
                    {accountsLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <LoadingSpinner />
                      </div>
                    ) : accounts.length === 0 ? (
                      <EmptyState
                        icon={<Users className="h-12 w-12 text-gray-400" />}
                        title="No validated users yet"
                        description="No users have been validated for this tenant"
                      />
                    ) : (
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>Name</TableHeader>
                            <TableHeader>Email</TableHeader>
                            <TableHeader>Status</TableHeader>
                            <TableHeader>Reference ID</TableHeader>
                            <TableHeader>Created</TableHeader>
                            <TableHeader>Actions</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {accounts.map((account) => (
                            <TableRow key={account.id}>
                              <TableCell>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {account.name || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>{account.email}</TableCell>
                              <TableCell>
                                <Badge variant={account.verification_status as any}>
                                  {account.verification_status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-xs">
                                  {account.reference_id || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatDate(account.createdAt || account.created_at)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewAccount(account)}
                                  icon={<Eye className="h-4 w-4" />}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    
                    {/* Accounts Pagination */}
                    {accountsPagination && accounts.length > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {((accountsPagination.page - 1) * accountsPagination.limit) + 1} to{' '}
                          {Math.min(accountsPagination.page * accountsPagination.limit, accountsPagination.total)} of{' '}
                          {accountsPagination.total} results
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAccountsPage(1)}
                            disabled={accountsPagination.page === 1}
                          >
                            First
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAccountsPage(p => Math.max(1, p - 1))}
                            disabled={accountsPagination.page === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                            Page {accountsPagination.page} of {accountsPagination.totalPages}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAccountsPage(p => p + 1)}
                            disabled={accountsPagination.page >= accountsPagination.totalPages}
                          >
                            Next
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAccountsPage(accountsPagination.totalPages)}
                            disabled={accountsPagination.page >= accountsPagination.totalPages}
                          >
                            Last
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      {tenant.webhook_url && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Webhook URL
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                  {tenant.webhook_url}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Details Modal */}
      <Modal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="Account Details"
        size="md"
      >
        {selectedAccount && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <p className="text-gray-900 dark:text-gray-100">{selectedAccount.name || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-gray-100">{selectedAccount.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <p className="text-gray-900 dark:text-gray-100">{selectedAccount.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verification Status
              </label>
              <Badge variant={selectedAccount.verification_status as any}>
                {selectedAccount.verification_status}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference ID
              </label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {selectedAccount.reference_id || 'N/A'}
                </p>
                {selectedAccount.reference_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedAccount.reference_id!)}
                    icon={<Copy className="h-3 w-3" />}
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created At
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDate(selectedAccount.createdAt || selectedAccount.created_at)}
              </p>
            </div>
            {selectedAccount.updatedAt || selectedAccount.updated_at ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Updated
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {formatDate(selectedAccount.updatedAt || selectedAccount.updated_at)}
                </p>
              </div>
            ) : null}
          </div>
        )}
        <ModalActions>
          <Button variant="ghost" onClick={() => setShowAccountModal(false)}>
            Close
          </Button>
        </ModalActions>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Tenant"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editFormData.email}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            required
          />
          <Input
            label="Quota Limit"
            type="number"
            value={editFormData.quota_limit}
            onChange={(e) => setEditFormData({ ...editFormData, quota_limit: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <ModalActions>
          <Button variant="ghost" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveEdit}
            loading={updateTenantMutation.isPending}
          >
            Save Changes
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}

