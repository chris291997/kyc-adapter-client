import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { Search, UserCircle, Plus } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { formatDate } from '../../utils/format'
import type { Account, PaginatedResponse } from '../../types'

export default function AccountsList() {
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 500)

  const { data, isLoading, error } = useQuery<PaginatedResponse<Account>>({
    queryKey: ['accounts', page, limit, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (debouncedSearch) {
        return apiClient.get<PaginatedResponse<Account>>(`${API_ENDPOINTS.ACCOUNTS}/search/${debouncedSearch}?${params}`)
      }
      return apiClient.get<PaginatedResponse<Account>>(`${API_ENDPOINTS.ACCOUNTS}?${params}`)
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
        <p className="text-red-600 dark:text-red-400">Failed to load accounts</p>
      </div>
    )
  }

  const accounts = data?.data || []
  
  // Extract pagination info from root level (not nested)
  const pagination = data ? {
    page: data.page || 1,
    limit: data.limit || 10,
    total: data.total || accounts.length,
    totalPages: data.totalPages || Math.ceil((data.total || accounts.length) / (data.limit || 10))
  } : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Accounts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer accounts and their verification status
          </p>
        </div>
        <Button icon={<Plus className="h-5 w-5" />}>
          Create Account
        </Button>
      </div>

      <Card>
        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search accounts by email, name, or reference ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="h-5 w-5" />}
          />
        </div>

        {accounts.length === 0 ? (
          <EmptyState
            icon={<UserCircle className="h-12 w-12 text-gray-400" />}
            title={searchQuery ? 'No accounts found' : 'No accounts yet'}
            description={searchQuery ? 'Try adjusting your search query' : 'Create your first account to get started'}
            action={
              !searchQuery && (
                <Button icon={<Plus className="h-5 w-5" />}>
                  Create Account
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
                  <TableHeader>Phone</TableHeader>
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
                    <TableCell>{account.phone || 'N/A'}</TableCell>
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
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                        <Button size="sm" variant="ghost">
                          Verify
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && accounts.length > 0 && (
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
    </div>
  )
}

