import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table'
import Badge from '../ui/Badge'
import LoadingSpinner from '../ui/LoadingSpinner'
import Modal, { ModalActions } from '../ui/Modal'
import Input from '../ui/Input'
import EmptyState from '../ui/EmptyState'
import { Plus, Settings, Trash2, CheckCircle, XCircle } from 'lucide-react'
import type { TenantProviderAssignment, Provider } from '../../types'

interface TenantProviderAssignmentProps {
  tenantId: string
}

export default function TenantProviderAssignmentComponent({ tenantId }: TenantProviderAssignmentProps) {
  const queryClient = useQueryClient()
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState('')
  const [priority, setPriority] = useState(1)

  // Fetch tenant's assigned providers
  const { data: assignments, isLoading: loadingAssignments } = useQuery<TenantProviderAssignment[]>({
    queryKey: ['tenant-provider-assignments', tenantId],
    queryFn: () => apiClient.get<TenantProviderAssignment[]>(`${API_ENDPOINTS.ADMIN_TENANTS}/${tenantId}/providers`),
  })

  // Fetch all available providers
  const { data: allProviders } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: () => apiClient.get<Provider[]>(API_ENDPOINTS.ADMIN_PROVIDERS),
  })

  // Assign provider mutation
  const assignProviderMutation = useMutation({
    mutationFn: ({ providerId, priority }: { providerId: string; priority: number }) =>
      apiClient.post(`${API_ENDPOINTS.ADMIN_TENANTS}/${tenantId}/providers`, { provider_id: providerId, priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-assignments', tenantId] })
      setShowAssignModal(false)
      setSelectedProviderId('')
      setPriority(1)
      alert('Provider assigned successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to assign provider: ${error.message}`)
    },
  })

  // Update assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: any }) =>
      apiClient.put(`${API_ENDPOINTS.ADMIN_TENANTS}/${tenantId}/providers/${assignmentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-assignments', tenantId] })
      alert('Assignment updated successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to update assignment: ${error.message}`)
    },
  })

  // Remove assignment mutation
  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      apiClient.delete(`${API_ENDPOINTS.ADMIN_TENANTS}/${tenantId}/providers/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-provider-assignments', tenantId] })
      alert('Provider removed from tenant!')
    },
    onError: (error: any) => {
      alert(`Failed to remove provider: ${error.message}`)
    },
  })

  const getAssignmentId = (assignment: TenantProviderAssignment): string | null => {
    // Try different possible ID fields based on API response structure
    return (assignment as any).id || 
           (assignment as any).assignment_id || 
           (assignment as any).configId || 
           (assignment as any).config_id ||
           null
  }

  const handleToggleEnabled = (assignment: TenantProviderAssignment) => {
    const assignmentId = getAssignmentId(assignment)
    if (!assignmentId) {
      console.error('Assignment object:', assignment)
      alert('Assignment ID not found. Check console for details.')
      return
    }
    updateAssignmentMutation.mutate({
      assignmentId,
      data: { is_enabled: !assignment.is_enabled },
    })
  }

  const handleUpdatePriority = (assignment: TenantProviderAssignment, newPriority: number) => {
    const assignmentId = getAssignmentId(assignment)
    if (!assignmentId) {
      console.error('Assignment object:', assignment)
      alert('Assignment ID not found. Check console for details.')
      return
    }
    updateAssignmentMutation.mutate({
      assignmentId,
      data: { priority: newPriority },
    })
  }

  const handleRemove = (assignment: TenantProviderAssignment) => {
    const assignmentId = getAssignmentId(assignment)
    if (!assignmentId) {
      console.error('Assignment object:', assignment)
      alert('Assignment ID not found. Check console for details.')
      return
    }
    if (confirm(`Remove ${assignment.provider?.name} from this tenant?`)) {
      removeAssignmentMutation.mutate(assignmentId)
    }
  }

  const handleAssign = () => {
    if (!selectedProviderId) {
      alert('Please select a provider')
      return
    }
    assignProviderMutation.mutate({ providerId: selectedProviderId, priority })
  }

  // Get available providers (not yet assigned)
  const availableProviders = allProviders?.filter(
    (provider) => !assignments?.some((a) => a.provider_id === provider.id)
  ) || []

  if (loadingAssignments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Provider Assignments</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage which KYC providers this tenant can use
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAssignModal(true)}
              icon={<Plus className="h-4 w-4" />}
              disabled={availableProviders.length === 0}
            >
              Assign Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!assignments || assignments.length === 0 ? (
            <EmptyState
              icon={<Settings className="h-12 w-12 text-gray-400" />}
              title="No providers assigned"
              description="Assign a KYC provider to enable verifications for this tenant"
              action={
                availableProviders.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setShowAssignModal(true)}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Assign Provider
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Provider</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Priority</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments
                  .sort((a, b) => a.priority - b.priority)
                  .map((assignment) => {
                    const assignmentId = getAssignmentId(assignment) || `assignment-${assignment.provider_id}`
                    return (
                    <TableRow key={assignmentId}>
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {assignment.provider?.name || 'Unknown Provider'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {assignment.provider?.type || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={assignment.priority}
                          onChange={(e) => handleUpdatePriority(assignment, parseInt(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleEnabled(assignment)}
                          className="flex items-center gap-2"
                        >
                          {assignment.is_enabled ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Enabled
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                Disabled
                              </span>
                            </>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(assignment)}
                          icon={<Trash2 className="h-4 w-4" />}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          )}

          {assignments && assignments.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Priority:</strong> Lower numbers are tried first. The adapter will attempt
                verification with priority 1 first, then 2, etc.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Provider Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Provider to Tenant"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Provider
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              value={selectedProviderId}
              onChange={(e) => setSelectedProviderId(e.target.value)}
            >
              <option value="">-- Select a provider --</option>
              {availableProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type || 'unknown'})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Priority"
            type="number"
            min="1"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
            helperText="Lower numbers are tried first (1 = highest priority)"
          />

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> The tenant will NOT see provider credentials. Credentials
              are managed centrally by super admins and automatically used during verification.
            </p>
          </div>
        </div>

        <ModalActions>
          <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAssign}
            loading={assignProviderMutation.isPending}
          >
            Assign Provider
          </Button>
        </ModalActions>
      </Modal>
    </>
  )
}

