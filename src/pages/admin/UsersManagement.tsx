import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal, { ModalActions } from '../../components/ui/Modal'
import { Search, Users as UsersIcon, Plus, X, Filter, Eye, Edit } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { formatDate } from '../../utils/format'
import type { User, PaginatedResponse, UserType, Tenant } from '../../types'

export default function UsersManagement() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 500)
  
  // Filter states (backend supported)
  const [tenantFilter, setTenantFilter] = useState('')
  const [includeSuperAdmins, setIncludeSuperAdmins] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // View, Edit, and Create states
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<User>>({})
  const [createFormData, setCreateFormData] = useState<{
    firstName: string
    lastName: string
    phone: string
    email: string
    password: string
    userType: UserType
    tenantId: string
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    userType: 'tenant_admin',
    tenantId: '',
  })

  // Fetch tenants for dropdown
  const { data: tenantsData } = useQuery<PaginatedResponse<Tenant>>({
    queryKey: ['tenants-dropdown'],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '100', // Get all tenants for dropdown
      })
      return apiClient.get<PaginatedResponse<Tenant>>(`${API_ENDPOINTS.ADMIN_TENANTS}?${params}`)
    },
  })

  const tenants = tenantsData?.data || []

  const { data, isLoading, error } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-users', page, limit, debouncedSearch, tenantFilter, includeSuperAdmins],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        })
        
        // Backend supported parameters
        if (debouncedSearch) {
          params.append('query', debouncedSearch)
        }
        
        if (tenantFilter) {
          params.append('tenantId', tenantFilter)
        }
        
        if (includeSuperAdmins) {
          params.append('includeSuperAdmins', 'true')
        }
        
        const result = await apiClient.get<PaginatedResponse<User>>(`${API_ENDPOINTS.ADMIN_USERS}?${params}`)
        console.log('Users API call:', `${API_ENDPOINTS.ADMIN_USERS}?${params}`)
        console.log('Users data:', result)
        return result
      } catch (err) {
        console.error('Users fetch error:', err)
        throw err
      }
    },
    retry: 1,
    refetchOnMount: true,
    staleTime: 0, // Always refetch when filters change
  })

  const handleClearFilters = () => {
    setSearchQuery('')
    setTenantFilter('')
    setIncludeSuperAdmins(false)
    setPage(1)
  }

  const handleView = (user: User) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setEditFormData({
      name: user.name,
      email: user.email,
      userType: (user.userType || user.user_type) as UserType,
    })
    setShowEditModal(true)
  }

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      apiClient.patch(`${API_ENDPOINTS.ADMIN_USERS}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowEditModal(false)
      alert('User updated successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to update user: ${error.message}`)
    },
  })

  const handleSaveEdit = () => {
    if (!selectedUser) return
    updateUserMutation.mutate({ id: selectedUser.id, data: editFormData })
  }

  const createUserMutation = useMutation({
    mutationFn: (data: any) => apiClient.post(API_ENDPOINTS.REGISTER, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreateModal(false)
      setCreateFormData({ firstName: '', lastName: '', phone: '', email: '', password: '', userType: 'tenant_admin', tenantId: '' })
      alert('User created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create user: ${error.message}`)
    },
  })

  const handleCreateUser = () => {
    if (!createFormData.email.trim()) {
      alert('Please enter user email')
      return
    }
    if (!createFormData.password.trim() || createFormData.password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }
    if (createFormData.userType !== 'super_admin' && !createFormData.tenantId) {
      alert('Please select a tenant for non-super admin users')
      return
    }

    // Build payload according to new API schema
    const payload: any = {
      email: createFormData.email.trim(),
      password: createFormData.password,
      userType: createFormData.userType,
    }

    // Add optional fields if provided
    if (createFormData.firstName.trim()) {
      payload.firstName = createFormData.firstName.trim()
    }
    if (createFormData.lastName.trim()) {
      payload.lastName = createFormData.lastName.trim()
    }
    if (createFormData.phone.trim()) {
      payload.phone = createFormData.phone.trim()
    }

    // Only include tenantId if it's not a super_admin and tenantId is provided
    if (createFormData.userType !== 'super_admin' && createFormData.tenantId) {
      payload.tenantId = createFormData.tenantId
    }

    createUserMutation.mutate(payload)
  }

  const hasActiveFilters = searchQuery !== '' || tenantFilter !== '' || includeSuperAdmins

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
        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Failed to load users</p>
        <p className="text-sm text-red-500 dark:text-red-300">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    )
  }

  const users = data?.data || []
  
  // Extract pagination info from root level (not nested)
  const pagination = data ? {
    page: data.page || 1,
    limit: data.limit || 10,
    total: data.total || users.length,
    totalPages: data.totalPages || Math.ceil((data.total || users.length) / (data.limit || 10))
  } : null

  console.log('Users:', users)
  console.log('Sample user:', users[0])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all users across the platform
          </p>
        </div>
        <Button 
          icon={<Plus className="h-5 w-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create User
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                icon={<Search className="h-5 w-5" />}
              />
            </div>
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="h-5 w-5" />}
            >
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                  {[searchQuery, tenantFilter, includeSuperAdmins].filter(Boolean).length}
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                icon={<X className="h-5 w-5" />}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tenant Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filter by Tenant
                  </label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={tenantFilter}
                    onChange={(e) => {
                      setTenantFilter(e.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">All Tenants</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Select a tenant to filter users, or "All Tenants" to show everyone
                  </p>
                </div>

                {/* Include Super Admins Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Include Super Admins
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSuperAdmins}
                      onChange={(e) => {
                        setIncludeSuperAdmins(e.target.checked)
                        setPage(1)
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show super admin users in results
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    By default, super admins are excluded
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-12 w-12 text-gray-400" />}
            title={hasActiveFilters ? 'No users found' : 'No users yet'}
            description={
              hasActiveFilters 
                ? 'Try adjusting your search or filters' 
                : 'Create your first user to get started'
            }
            action={
              !hasActiveFilters && (
                <Button icon={<Plus className="h-5 w-5" />}>
                  Create User
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
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Tenant</TableHeader>
                  <TableHeader>Created</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge>
                        {(user.userType || user.user_type || 'unknown').replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.tenantId || user.tenant_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatDate(user.createdAt || user.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEdit(user)}
                          icon={<Edit className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleView(user)}
                          icon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && users.length > 0 && (
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

            {/* Results Summary */}
            {users.length > 0 && hasActiveFilters && (
              <div className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Found {pagination?.total || users.length} result{(pagination?.total || users.length) !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {tenantFilter && ` in tenant ${tenants.find(t => t.id === tenantFilter)?.name || tenantFilter}`}
                  {includeSuperAdmins && ` (including super admins)`}
                </p>
              </div>
            )}
          </>
        )}
      </Card>

      {/* View User Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="User Details"
        size="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <p className="text-gray-900 dark:text-gray-100">{selectedUser.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-gray-100">{selectedUser.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <Badge>
                {(selectedUser.userType || selectedUser.user_type || 'unknown').replace(/_/g, ' ')}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tenant
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {selectedUser.tenantId || selectedUser.tenant_id || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDate(selectedUser.createdAt || selectedUser.created_at)}
              </p>
            </div>
          </div>
        )}
        <ModalActions>
          <Button variant="ghost" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowViewModal(false)
              if (selectedUser) handleEdit(selectedUser)
            }}
          >
            Edit User
          </Button>
        </ModalActions>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={editFormData.name || ''}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            placeholder="User name"
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={editFormData.email || ''}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            placeholder="user@example.com"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              value={editFormData.userType || editFormData.user_type || ''}
              onChange={(e) => setEditFormData({ ...editFormData, userType: e.target.value as UserType })}
            >
              <option value="tenant_admin">Tenant Admin</option>
              <option value="tenant_user">Tenant User</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>
        
        <ModalActions>
          <Button variant="ghost" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveEdit}
            loading={updateUserMutation.isPending}
          >
            Save Changes
          </Button>
        </ModalActions>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create User"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={createFormData.firstName}
              onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
              placeholder="John"
            />
            
            <Input
              label="Last Name"
              value={createFormData.lastName}
              onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
              placeholder="Doe"
            />
          </div>
          
          <Input
            label="Email"
            type="email"
            value={createFormData.email}
            onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
            placeholder="john.doe@example.com"
            required
          />

          <Input
            label="Phone"
            value={createFormData.phone}
            onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
            placeholder="+1234567890"
          />

          <Input
            label="Password"
            type="password"
            value={createFormData.password}
            onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
            placeholder="Minimum 8 characters"
            required
            helperText="Password must be at least 8 characters long"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User Type
            </label>
            <select
              value={createFormData.userType}
              onChange={(e) => setCreateFormData({ ...createFormData, userType: e.target.value as UserType, tenantId: e.target.value === 'super_admin' ? '' : createFormData.tenantId })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="tenant_admin">Tenant Admin</option>
              <option value="tenant_user">Tenant User</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {createFormData.userType !== 'super_admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tenant {createFormData.userType === 'tenant_admin' || createFormData.userType === 'tenant_user' ? '*' : ''}
              </label>
              <select
                value={createFormData.tenantId}
                onChange={(e) => setCreateFormData({ ...createFormData, tenantId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required={true}
              >
                <option value="">Select a tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <ModalActions>
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateUser}
            loading={createUserMutation.isPending}
          >
            Create User
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}

