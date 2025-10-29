import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Card, { CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { ArrowLeft, Copy } from 'lucide-react'
import { formatDate } from '../../utils/format'
import type { VerificationInitiateResponse, Verification } from '../../types'
import { websocketService } from '../../services/websocketService'
import { useEffect, useState } from 'react'

export default function ValidationPage() {
  const { tenantId, verificationId } = useParams<{ tenantId: string; verificationId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [apiResponse, setApiResponse] = useState<VerificationInitiateResponse | null>(
    location.state?.response || null
  )
  const [verificationStatus, setVerificationStatus] = useState<string>('')

  // State to store verification data from WebSocket updates
  const [verification, setVerification] = useState<Verification | null>(null)

  // Subscribe to WebSocket updates only - no polling
  useEffect(() => {
    if (!verificationId) return

    const unsubscribe = websocketService.subscribeToVerification(verificationId, (data) => {
      console.log('Verification update received:', data)
      const status = data.status || data.verificationStatus || ''
      setVerificationStatus(status)
      
      // Update verification state with WebSocket data
      setVerification({
        id: verificationId,
        status: status,
        verificationType: data.verificationType || apiResponse?.verificationType || 'document',
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
        result: data.result || data.verificationResult,
      } as Verification)
    })

    return () => {
      unsubscribe()
    }
  }, [verificationId, apiResponse])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    const normalizedStatus = status.toLowerCase()
    
    if (normalizedStatus.includes('approved') || normalizedStatus === 'approved') {
      return <Badge variant="success">Approved</Badge>
    }
    if (normalizedStatus.includes('rejected') || normalizedStatus === 'rejected') {
      return <Badge variant="danger">Rejected</Badge>
    }
    if (normalizedStatus.includes('pending') || normalizedStatus === 'pending') {
      return <Badge variant="warning">Pending</Badge>
    }
    if (normalizedStatus.includes('processing') || normalizedStatus === 'processing') {
      return <Badge variant="info">Processing</Badge>
    }
    return <Badge>{status}</Badge>
  }

  if (!apiResponse && !verificationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No verification data available</p>
        </div>
      </div>
    )
  }

  // If we don't have apiResponse but have verificationId, construct a basic response
  const displayResponse = apiResponse || (verificationId ? {
    verificationId: verificationId,
    verification_id: verificationId,
    status: verification?.status || 'pending',
    verificationType: verification?.verificationType || 'document',
    result: verification?.result,
  } : null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/admin/tenants/${tenantId}`)}
            icon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Tenant
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Verification Validation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Verification ID: {verificationId}
            </p>
          </div>
        </div>
      </div>

      {/* API Response */}
      {displayResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Initialize Verification API Response</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(JSON.stringify(displayResponse, null, 2))}
                icon={<Copy className="h-4 w-4" />}
              >
                Copy JSON
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Verification ID
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {displayResponse.verificationId || displayResponse.verification_id || 'N/A'}
                    </p>
                    {(displayResponse.verificationId || displayResponse.verification_id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(displayResponse.verificationId || displayResponse.verification_id || '')
                        }
                        icon={<Copy className="h-3 w-3" />}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  {getStatusBadge(displayResponse.status)}
                </div>
                {displayResponse.sessionUrl || displayResponse.session_url ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Session URL
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all flex-1">
                        {displayResponse.sessionUrl || displayResponse.session_url}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          window.open(displayResponse.sessionUrl || displayResponse.session_url, '_blank')
                        }
                      >
                        Open Session
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(displayResponse.sessionUrl || displayResponse.session_url || '')
                        }
                        icon={<Copy className="h-3 w-3" />}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Full JSON Response */}
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Full Response JSON
                </label>
                <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs font-mono">
                  {JSON.stringify(displayResponse, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Verification Status */}
      {verification && (
        <Card>
          <CardHeader>
            <CardTitle>Current Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </label>
                {getStatusBadge(verification.status || verification.verificationStatus)}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Verification Type
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {verification.verificationType || 'N/A'}
                </p>
              </div>
              {verification.createdAt || verification.created_at ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(verification.createdAt || verification.created_at)}
                  </p>
                </div>
              ) : null}
              {verification.updatedAt || verification.updated_at ? (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(verification.updatedAt || verification.updated_at)}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Verification Result (if available) */}
            {verification.result && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Verification Result
                </label>
                <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs font-mono">
                  {JSON.stringify(verification.result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WebSocket Status Indicator */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                websocketService.isConnected() ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              WebSocket: {websocketService.isConnected() ? 'Connected' : 'Disconnected'}
            </span>
            {verificationStatus && (
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                Last Update: {verificationStatus}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

