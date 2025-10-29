import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../services/apiClient'
import { API_ENDPOINTS } from '../../constants'
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal, { ModalActions } from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import { Plus, Shield, Copy, Key, RefreshCw, Eye, Edit, Trash2, PlusCircle, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '../../utils/format'
import { generateHMACSecret, copyToClipboard } from '../../utils/crypto'
import type { Provider, UpdateProviderRequest } from '../../types'

export default function ProviderManagement() {
  const queryClient = useQueryClient()
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [showSecretModal, setShowSecretModal] = useState(false)
  const [newSecret, setNewSecret] = useState('')
  const [showRotateConfirm, setShowRotateConfirm] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editFormData, setEditFormData] = useState<UpdateProviderRequest>({})
  const [createFormData, setCreateFormData] = useState<UpdateProviderRequest>({
    name: '',
    type: 'multi_step',
    status: 'active',
    base_url: '',
    api_key: '',
    secret_key: '',
    webhook_secret: '',
    api_version: 'v1',
    supports_webhooks: true,
    supports_multi_step: false,
    supports_hosted_workflow: false,
  })
  const [configFields, setConfigFields] = useState<Record<string, string>>({})
  
  // Show/hide toggles for sensitive fields
  const [showApiKey, setShowApiKey] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  const { data: providers, isLoading, error } = useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: () => apiClient.get<Provider[]>(API_ENDPOINTS.ADMIN_PROVIDERS),
  })

  const createProviderMutation = useMutation({
    mutationFn: (data: UpdateProviderRequest) =>
      apiClient.post(API_ENDPOINTS.ADMIN_PROVIDERS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setShowCreateModal(false)
      setCreateFormData({
        name: '',
        type: 'multi_step',
        status: 'active',
        base_url: '',
        api_key: '',
        secret_key: '',
        webhook_secret: '',
        api_version: 'v1',
        supports_webhooks: true,
        supports_multi_step: false,
        supports_hosted_workflow: false,
      })
      setConfigFields({})
      setShowApiKey(false)
      setShowSecretKey(false)
      setShowWebhookSecret(false)
      alert('Provider created successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to create provider: ${error.message}`)
    },
  })

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProviderRequest }) =>
      apiClient.put(`${API_ENDPOINTS.ADMIN_PROVIDERS}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setShowEditModal(false)
      setShowApiKey(false)
      setShowSecretKey(false)
      setShowWebhookSecret(false)
      alert('Provider updated successfully!')
    },
    onError: (error: any) => {
      alert(`Failed to update provider: ${error.message}`)
    },
  })

  const handleGenerateWebhookSecret = (isCreate = false) => {
    const secret = generateHMACSecret(32)
    setNewSecret(secret)
    if (isCreate) {
      setCreateFormData({ ...createFormData, webhook_secret: secret })
    } else {
      setEditFormData({ ...editFormData, webhook_secret: secret })
    }
  }

  const handleCreateProvider = () => {
    if (!createFormData.name || !createFormData.base_url) {
      alert('Please fill in required fields: Name and Base URL')
      return
    }
    
    // Convert config fields to object
    const config: Record<string, any> = {}
    Object.entries(configFields).forEach(([key, value]) => {
      if (value && !isNaN(Number(value)) && value.trim() !== '') {
        config[key] = Number(value)
      } else if (value === 'true' || value === 'false') {
        config[key] = value === 'true'
      } else {
        config[key] = value
      }
    })
    
    // Convert status string to boolean is_active
    const payload = {
      ...createFormData,
      is_active: createFormData.status === 'active',
      config
    }
    
    // Remove status field since backend expects is_active instead
    delete (payload as any).status
    
    createProviderMutation.mutate(payload)
  }

  const handleView = (provider: Provider) => {
    setSelectedProvider(provider)
    setShowViewModal(true)
  }

  const handleEdit = async (provider: Provider) => {
    setSelectedProvider(provider)
    
    // Fetch full provider details with credentials
    try {
      const fullProvider = await apiClient.get<Provider>(`${API_ENDPOINTS.ADMIN_PROVIDERS}/${provider.id}`)
      
      // Convert backend is_active (boolean) to status (string) for form
      const isActive = fullProvider.is_active ?? fullProvider.status === 'active'
      
      setEditFormData({
        name: fullProvider.name,
        type: fullProvider.type,
        status: isActive ? 'active' : 'inactive',
        base_url: fullProvider.base_url || '',
        api_key: fullProvider.api_key || '',
        secret_key: fullProvider.secret_key || '',
        webhook_secret: fullProvider.webhook_secret || '',
        api_version: fullProvider.api_version || '',
        supports_webhooks: fullProvider.supports_webhooks,
        supports_multi_step: fullProvider.supports_multi_step,
        supports_hosted_workflow: fullProvider.supports_hosted_workflow,
      })
      
      // Convert config object to form fields
      const fields: Record<string, string> = {}
      if (fullProvider.config && typeof fullProvider.config === 'object') {
        Object.entries(fullProvider.config).forEach(([key, value]) => {
          fields[key] = String(value)
        })
      }
      setConfigFields(fields)
      setShowEditModal(true)
    } catch (err) {
      console.error('Failed to fetch provider details:', err)
      alert('Failed to load provider details')
    }
  }

  const handleSaveEdit = () => {
    if (!selectedProvider) return
    
    // Convert form fields back to config object
    const config: Record<string, any> = {}
    Object.entries(configFields).forEach(([key, value]) => {
      // Try to parse as number if it looks like a number
      if (value && !isNaN(Number(value)) && value.trim() !== '') {
        config[key] = Number(value)
      } else if (value === 'true' || value === 'false') {
        config[key] = value === 'true'
      } else {
        config[key] = value
      }
    })
    
    // Convert status string to boolean is_active
    const payload = {
      ...editFormData,
      is_active: editFormData.status === 'active',
      config
    }
    
    // Remove status field since backend expects is_active instead
    delete (payload as any).status
    
    updateProviderMutation.mutate({ 
      id: selectedProvider.id, 
      data: payload 
    })
  }

  const handleAddConfigField = () => {
    const key = prompt('Enter configuration key (e.g., timeout, retryAttempts):')
    if (key && key.trim() && !configFields[key]) {
      setConfigFields({ ...configFields, [key]: '' })
    }
  }

  const handleRemoveConfigField = (key: string) => {
    const newFields = { ...configFields }
    delete newFields[key]
    setConfigFields(newFields)
  }

  const handleCopyToClipboard = async (text: string, label: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      alert(`${label} copied to clipboard!`)
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
        <p className="text-red-600 dark:text-red-400">Failed to load providers</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Provider Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Centralized KYC provider credentials and configuration
          </p>
        </div>
        <Button 
          icon={<Plus className="h-5 w-5" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Provider
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {providers?.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{provider.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={provider.status || provider.is_active ? 'active' : 'inactive'}>
                    {provider.status || (provider.is_active ? 'active' : 'inactive')}
                </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Credential Status Indicators */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-center gap-2 text-xs">
                  {provider.api_key_set ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-gray-600 dark:text-gray-400">API Key</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {provider.secret_key_set ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-gray-600 dark:text-gray-400">Secret</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {provider.webhook_secret_set ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-gray-600 dark:text-gray-400">Webhook</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Webhook Endpoint
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={provider.webhook_endpoint || `${window.location.origin}/api/v1/webhook/${provider.name?.toLowerCase()}`}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyToClipboard(provider.webhook_endpoint || '', 'Webhook URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Created: {formatDate(provider.createdAt || provider.created_at)}
                  </p>
                    <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleView(provider)}
                      icon={<Eye className="h-4 w-4" />}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(provider)}
                      icon={<Edit className="h-4 w-4" />}
                    >
                      Edit
                    </Button>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!providers || providers.length === 0) && (
        <EmptyState
          icon={<Shield className="h-12 w-12 text-gray-400" />}
          title="No providers found"
          description="Add your first KYC provider to get started"
          action={
            <Button 
              icon={<Plus className="h-5 w-5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Add Provider
            </Button>
          }
        />
      )}

      {/* Create Provider Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setShowApiKey(false)
          setShowSecretKey(false)
          setShowWebhookSecret(false)
          setConfigFields({})
        }}
        title="Add New Provider"
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Provider Name"
                value={createFormData.name || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                placeholder="e.g., IDmeta"
                required
              />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={createFormData.type || 'multi_step'}
                  onChange={(e) => setCreateFormData({ ...createFormData, type: e.target.value as any })}
                >
                  <option value="single_step">Single Step</option>
                  <option value="multi_step">Multi Step</option>
                  <option value="async_webhook">Async Webhook</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={createFormData.status || 'active'}
                  onChange={(e) => setCreateFormData({ ...createFormData, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <Input
                label="API Version"
                value={createFormData.api_version || ''}
                onChange={(e) => setCreateFormData({ ...createFormData, api_version: e.target.value })}
                placeholder="e.g., v1"
              />
            </div>

            <Input
              label="Base URL"
              type="url"
              value={createFormData.base_url || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, base_url: e.target.value })}
              placeholder="https://api.provider.com"
              helperText="Provider's API base URL"
              required
            />
          </div>

          {/* Credentials */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
              Credentials
            </h3>

            <Input
              label="API Key"
              type={showApiKey ? 'text' : 'password'}
              value={createFormData.api_key || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, api_key: e.target.value })}
              placeholder="pk_live_..."
              className="font-mono text-sm"
            />

            <Input
              label="Secret Key"
              type={showSecretKey ? 'text' : 'password'}
              value={createFormData.secret_key || ''}
              onChange={(e) => setCreateFormData({ ...createFormData, secret_key: e.target.value })}
              placeholder="sk_live_..."
              className="font-mono text-sm"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook Secret (HMAC)
            </label>
            <div className="flex items-center gap-2">
              <Input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={createFormData.webhook_secret || ''}
                  onChange={(e) => setCreateFormData({ ...createFormData, webhook_secret: e.target.value })}
                  placeholder="whsec_..."
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                  variant="primary"
                  onClick={() => handleGenerateWebhookSecret(true)}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
              Capabilities
            </h3>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={createFormData.supports_webhooks || false}
                  onChange={(e) => setCreateFormData({ ...createFormData, supports_webhooks: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supports Webhooks</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={createFormData.supports_multi_step || false}
                  onChange={(e) => setCreateFormData({ ...createFormData, supports_multi_step: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supports Multi-Step Verification</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={createFormData.supports_hosted_workflow || false}
                  onChange={(e) => setCreateFormData({ ...createFormData, supports_hosted_workflow: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supports Hosted Workflow</span>
              </label>
            </div>
          </div>
        </div>

        <ModalActions>
          <Button variant="ghost" onClick={() => {
            setShowCreateModal(false)
            setShowApiKey(false)
            setShowSecretKey(false)
            setShowWebhookSecret(false)
            setConfigFields({})
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateProvider}
            loading={createProviderMutation.isPending}
          >
            Create Provider
          </Button>
        </ModalActions>
      </Modal>

      {/* View Provider Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Provider Details"
        size="lg"
      >
        {selectedProvider && (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provider Name
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {selectedProvider.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {selectedProvider.type || 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Badge variant={selectedProvider.status || selectedProvider.is_active ? 'active' : 'inactive'}>
                {selectedProvider.status || (selectedProvider.is_active ? 'active' : 'inactive')}
              </Badge>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook Endpoint
            </label>
            <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-gray-900 dark:text-gray-100 flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedProvider.webhook_endpoint || 'Not configured'}
                </p>
              <Button
                size="sm"
                  variant="ghost"
                  onClick={() => handleCopyToClipboard(selectedProvider.webhook_endpoint || '', 'Webhook URL')}
                icon={<Copy className="h-4 w-4" />}
              >
                Copy
              </Button>
            </div>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credentials Status
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedProvider.api_key_set ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">API Key</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedProvider.secret_key_set ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">Secret Key</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedProvider.webhook_secret_set ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600 dark:text-gray-400">Webhook Secret</span>
                </div>
          </div>
        </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configuration
              </label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto">
                  {JSON.stringify(selectedProvider.config || {}, null, 2)}
                </pre>
              </div>
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
              if (selectedProvider) handleEdit(selectedProvider)
            }}
            icon={<Edit className="h-4 w-4" />}
          >
            Edit Provider
          </Button>
        </ModalActions>
      </Modal>

      {/* Edit Provider Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setShowApiKey(false)
          setShowSecretKey(false)
          setShowWebhookSecret(false)
        }}
        title="Edit Provider Configuration"
        size="xl"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Provider Name"
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="e.g., IDmeta"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={editFormData.type || 'multi_step'}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as any })}
                >
                  <option value="single_step">Single Step</option>
                  <option value="multi_step">Multi Step</option>
                  <option value="async_webhook">Async Webhook</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  value={editFormData.status || 'active'}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <Input
                label="API Version"
                value={editFormData.api_version || ''}
                onChange={(e) => setEditFormData({ ...editFormData, api_version: e.target.value })}
                placeholder="e.g., v1"
              />
            </div>

            <Input
              label="Base URL"
              type="url"
              value={editFormData.base_url || ''}
              onChange={(e) => setEditFormData({ ...editFormData, base_url: e.target.value })}
              placeholder="https://api.provider.com"
              helperText="Provider's API base URL"
            />
          </div>

          {/* Credentials (Secure) */}
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
              Credentials (Secure)
            </h3>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Security Notice:</strong> Credentials are encrypted at rest and never displayed to tenants.
            </p>
          </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={editFormData.api_key || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, api_key: e.target.value })}
                  placeholder="pk_live_..."
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowApiKey(!showApiKey)}
                  icon={showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyToClipboard(editFormData.api_key || '', 'API Key')}
                  icon={<Copy className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secret Key
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type={showSecretKey ? 'text' : 'password'}
                  value={editFormData.secret_key || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, secret_key: e.target.value })}
                  placeholder="sk_live_..."
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  icon={showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyToClipboard(editFormData.secret_key || '', 'Secret Key')}
                  icon={<Copy className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook Secret (HMAC)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={editFormData.webhook_secret || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, webhook_secret: e.target.value })}
                  placeholder="whsec_..."
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  icon={showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyToClipboard(editFormData.webhook_secret || '', 'Webhook Secret')}
                  icon={<Copy className="h-4 w-4" />}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleGenerateWebhookSecret}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Used to verify webhook signatures from this provider
              </p>
            </div>
          </div>

          {/* Provider Capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">
              Capabilities
            </h3>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={editFormData.supports_webhooks || false}
                  onChange={(e) => setEditFormData({ ...editFormData, supports_webhooks: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supports Webhooks</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={editFormData.supports_multi_step || false}
                  onChange={(e) => setEditFormData({ ...editFormData, supports_multi_step: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supports Multi-Step Verification</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={editFormData.supports_hosted_workflow || false}
                  onChange={(e) => setEditFormData({ ...editFormData, supports_hosted_workflow: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Supports Hosted Workflow</span>
              </label>
            </div>
          </div>

          {/* Configuration Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Additional Configuration
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddConfigField}
                icon={<PlusCircle className="h-4 w-4" />}
              >
                Add Field
              </Button>
            </div>

            {Object.keys(configFields).length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  No configuration fields yet
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAddConfigField}
                  icon={<PlusCircle className="h-4 w-4" />}
                >
                  Add First Field
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(configFields).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {key}
                      </label>
                      <Input
                        value={value}
                        onChange={(e) => setConfigFields({ ...configFields, [key]: e.target.value })}
                        placeholder={`Enter ${key}`}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveConfigField(key)}
                      className="mt-6"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                <strong>Common fields:</strong> timeout, retryAttempts, region, environment
              </p>
            </div>
          </div>
        </div>

        <ModalActions>
          <Button variant="ghost" onClick={() => {
            setShowEditModal(false)
            setShowApiKey(false)
            setShowSecretKey(false)
            setShowWebhookSecret(false)
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveEdit}
            loading={updateProviderMutation.isPending}
          >
            Save Changes
          </Button>
        </ModalActions>
      </Modal>
    </div>
  )
}
