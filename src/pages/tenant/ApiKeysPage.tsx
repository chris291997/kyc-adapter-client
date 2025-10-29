import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../../services/authService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal, { ModalActions } from '../../components/ui/Modal'
import { Plus, Key, Copy, Trash2 } from 'lucide-react'
import { formatDate, formatApiKey } from '../../utils/format'
import { copyToClipboard } from '../../utils/crypto'
import type { ApiKey, CreateApiKeyRequest } from '../../types'

export default function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')
  const [formData, setFormData] = useState<CreateApiKeyRequest>({
    name: '',
    expires_in_days: 90,
  })

  const { data: apiKeys, isLoading, error } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => authService.listApiKeys(),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateApiKeyRequest) => authService.createApiKey(data),
    onSuccess: (data) => {
      setNewApiKey(data.api_key)
      setShowCreateModal(false)
      setShowKeyModal(true)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authService.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      alert('API key revoked successfully')
    },
  })

  const handleCreate = () => {
    createMutation.mutate(formData)
  }

  const handleCopyKey = async () => {
    const success = await copyToClipboard(newApiKey)
    if (success) {
      alert('API key copied to clipboard!')
    }
  }

  const handleRevoke = (id: string) => {
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      revokeMutation.mutate(id)
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
        <p className="text-red-600 dark:text-red-400">Failed to load API keys</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            API Keys
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage API keys for programmatic access
          </p>
        </div>
        <Button 
          icon={<Plus className="h-5 w-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create API Key
        </Button>
      </div>

      <Card>
        {!apiKeys || apiKeys.length === 0 ? (
          <EmptyState
            icon={<Key className="h-12 w-12 text-gray-400" />}
            title="No API keys found"
            description="Create your first API key to enable programmatic access"
            action={
              <Button 
                icon={<Plus className="h-5 w-5" />}
                onClick={() => setShowCreateModal(true)}
              >
                Create API Key
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Key Prefix</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Last Used</TableHeader>
                <TableHeader>Expires</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {apiKey.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-xs">
                      {formatApiKey(apiKey.key_prefix)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={apiKey.is_active ? 'active' : 'inactive'}>
                      {apiKey.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                    <TableCell>
                      {apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {apiKey.expires_at ? formatDate(apiKey.expires_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {formatDate(apiKey.createdAt || apiKey.created_at)}
                    </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(apiKey.id)}
                      icon={<Trash2 className="h-4 w-4" />}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create API Key"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Production API Key"
            required
          />

          <Input
            label="Expires in (days)"
            type="number"
            value={formData.expires_in_days}
            onChange={(e) => setFormData({ 
              ...formData, 
              expires_in_days: parseInt(e.target.value) 
            })}
            helperText="Set to 0 for no expiration"
          />
        </div>

        <ModalActions>
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreate}
            loading={createMutation.isPending}
          >
            Create
          </Button>
        </ModalActions>
      </Modal>

      {/* Display New API Key Modal */}
      <Modal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title="API Key Created"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Important:</strong> This API key will only be shown once. 
              Copy it now and store it securely.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={newApiKey}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyKey}
                icon={<Copy className="h-4 w-4" />}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Usage:
            </h4>
            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
{`curl -X POST https://api.kyc-adapter.com/verifications/initiate \\
  -H "X-API-Key: ${newApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"verificationType": "document", "userEmail": "user@example.com"}'`}
            </pre>
          </div>
        </div>

        <ModalActions>
          <Button variant="primary" onClick={() => setShowKeyModal(false)}>
            Done
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}

