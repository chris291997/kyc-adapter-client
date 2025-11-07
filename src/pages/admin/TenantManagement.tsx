import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Plus, Building2, Eye, Edit, Search, X } from 'lucide-react'
import { formatDate } from '../../utils/format'
import { useDebounce } from '../../hooks/useDebounce'
import type { Tenant, PaginatedResponse } from '../../types'

export default function TenantManagement() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Tenant>>({})
  const [createFormData, setCreateFormData] = useState({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    status: 'active' as 'active' | 'suspended',
    quotaLimit: 1000,
  })
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 500)

  const { data, isLoading, error } = useQuery<PaginatedResponse<Tenant>>({
    queryKey: ['tenants', page, limit, debouncedSearch],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        })
        
        // Backend only supports 'search' parameter for filtering by name/email
        if (debouncedSearch) {
          params.append('search', debouncedSearch)
        }
        
        const result = await apiClient.get<PaginatedResponse<Tenant>>(`${API_ENDPOINTS.ADMIN_TENANTS}?${params}`)
        return result
      } catch (err) {
        console.error('Tenants fetch error:', err)
        throw err
      }
    },
    retry: 1,
    refetchOnMount: true,
    staleTime: 0, // Always refetch when query changes
  })

  const createTenantMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient.post(API_ENDPOINTS.ADMIN_TENANTS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowCreateModal(false)
      setCreateFormData({ 
        name: '', 
        firstName: '',
        lastName: '',
        email: '', 
        mobile: '',
        password: '',
        status: 'active',
        quotaLimit: 1000,
      })
      alert('Tenant created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create tenant: ${error.message}`)
    },
  })

  const updateTenantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tenant> }) =>
      apiClient.patch(`${API_ENDPOINTS.ADMIN_TENANTS}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowEditModal(false)
      alert('Tenant updated successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to update tenant: ${error.message}`)
    },
  })

  const handleCreateTenant = () => {
    // Validate all required fields
    if (!createFormData.name.trim()) {
      alert('Please enter tenant name')
      return
    }
    if (!createFormData.firstName.trim()) {
      alert('Please enter admin first name')
      return
    }
    if (!createFormData.lastName.trim()) {
      alert('Please enter admin last name')
      return
    }
    if (!createFormData.email.trim()) {
      alert('Please enter admin email')
      return
    }
    if (!createFormData.password.trim() || createFormData.password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }
    if (!createFormData.mobile.trim()) {
      alert('Please enter admin mobile number')
      return
    }

    // Structure data according to API requirements
    // Based on the backend API documentation, the tenant creation endpoint creates both
    // a tenant entity and a default tenant admin user
    const payload = {
      // Tenant organization information
      name: createFormData.name.trim(),
      quotaLimit: createFormData.quotaLimit,
      status: createFormData.status,
      
      // Admin user credentials
      email: createFormData.email.trim(),
      password: createFormData.password,
      
      // Additional admin user details
      firstName: createFormData.firstName.trim(),
      lastName: createFormData.lastName.trim(),
      mobile: createFormData.mobile.trim(),
    }

    createTenantMutation.mutate(payload)
  }

  const handleView = (tenant: Tenant) => {
    navigate(`/admin/tenants/${tenant.id}`)
  }

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setEditFormData({
      name: tenant.name,
      email: tenant.email,
      status: tenant.status,
      quota_limit: tenant.quota_limit,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!selectedTenant) return
    updateTenantMutation.mutate({ id: selectedTenant.id, data: editFormData })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setPage(1)
  }

  const hasActiveFilters = searchQuery !== ''

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
        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Failed to load tenants</p>
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

  const tenants = data?.data || []
  
  // Extract pagination info from root level (not nested)
  const pagination = data ? {
    page: data.page || 1,
    limit: data.limit || 10,
    total: data.total || tenants.length,
    totalPages: data.totalPages || Math.ceil((data.total || tenants.length) / (data.limit || 10))
  } : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tenant Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all tenant organizations
          </p>
        </div>
        <Button 
          icon={<Plus className="h-5 w-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Tenant
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search tenants by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              icon={<Search className="h-5 w-5" />}
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              icon={<X className="h-5 w-5" />}
            >
              Clear Search
            </Button>
          )}
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        {tenants.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-12 w-12 text-gray-400" />}
            title={hasActiveFilters ? "No tenants found" : "No tenants yet"}
            description={
              hasActiveFilters 
                ? "Try adjusting your search or filters" 
                : "Create your first tenant to get started"
            }
            action={
              !hasActiveFilters && (
                <Button icon={<Plus className="h-5 w-5" />}>
                  Create Tenant
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Quota</TableHeader>
                  <TableHeader>Created</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {tenant.name}
                      </div>
                    </TableCell>
                    <TableCell>{tenant.email}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.quota_used} / {tenant.quota_limit}
                    </TableCell>
                    <TableCell>
                      {formatDate(tenant.createdAt || tenant.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleView(tenant)}
                          icon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEdit(tenant)}
                          icon={<Edit className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && tenants.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} results
                </p>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Tenant Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Tenant"
        size="lg"
      >
        <div className="space-y-6">
          {/* Tenant Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Tenant Information
            </h3>
            <div className="space-y-4">
              <Input
                label="Tenant Name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                placeholder="e.g., Acme Corporation"
                required
                helperText="The organization name for this tenant"
              />

              <Input
                label="Quota Limit"
                type="number"
                value={createFormData.quotaLimit}
                onChange={(e) => setCreateFormData({ ...createFormData, quotaLimit: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 1000"
                required
                helperText="Maximum number of verifications allowed per month"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={createFormData.status}
                  onChange={(e) => setCreateFormData({ ...createFormData, status: e.target.value as 'active' | 'suspended' })}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Admin User Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Tenant Admin User
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={createFormData.firstName}
                  onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                  placeholder="e.g., John"
                  required
                />

                <Input
                  label="Last Name"
                  value={createFormData.lastName}
                  onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                  placeholder="e.g., Doe"
                  required
                />
              </div>

              <Input
                label="Email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                placeholder="admin@acme.com"
                required
                helperText="This email will be used for the tenant admin login"
              />

              <Input
                label="Mobile Number"
                type="tel"
                value={createFormData.mobile}
                onChange={(e) => setCreateFormData({ ...createFormData, mobile: e.target.value })}
                placeholder="e.g., +1234567890"
                required
                helperText="Include country code"
              />

              <Input
                label="Password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                placeholder="Enter secure password (min. 8 characters)"
                required
                helperText="Minimum 8 characters"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> After creating the tenant, you'll need to:
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside mt-2 space-y-1">
              <li>Assign KYC providers to this tenant</li>
              <li>Configure provider priorities if using multiple providers</li>
              <li>Set up webhook callbacks for verification updates (optional)</li>
            </ul>
          </div>
        </div>

        <ModalActions>
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateTenant}
            loading={createTenantMutation.isPending}
          >
            Create Tenant
          </Button>
        </ModalActions>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Tenant"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Tenant Name"
            value={editFormData.name || ''}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            placeholder="e.g., Acme Corporation"
            required
          />

          <Input
            label="Email"
            type="email"
            value={editFormData.email || ''}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            placeholder="e.g., contact@acme.com"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              value={editFormData.status || 'active'}
              onChange={(e) => setEditFormData({ 
                ...editFormData, 
                status: e.target.value as 'active' | 'suspended' 
              })}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <Input
            label="Quota Limit"
            type="number"
            value={editFormData.quota_limit || 0}
            onChange={(e) => setEditFormData({ 
              ...editFormData, 
              quota_limit: parseInt(e.target.value) || 0
            })}
            placeholder="e.g., 1000"
            helperText="Maximum number of verifications allowed"
            required
          />

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Webhooks are now configured at the provider level. 
              To receive verification updates, configure the callback URL when initiating verifications.
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> Changing the status to "Suspended" will prevent 
              this tenant from creating new verifications. Existing verifications will 
              continue to process normally.
            </p>
          </div>
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

