// User Types
export type UserType = 'super_admin' | 'tenant_admin' | 'tenant_user'

export interface User {
  id: string
  email: string
  name: string
  userType?: UserType
  user_type?: string  // Backend might use snake_case
  tenantId?: string | null
  tenant_id?: string | null  // Backend might use snake_case
  createdAt?: string
  updatedAt?: string
  created_at?: string  // Backend might use snake_case
  updated_at?: string  // Backend might use snake_case
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

// Tenant Types
export interface Tenant {
  id: string
  name: string
  email: string
  status: 'active' | 'suspended'
  quota_limit: number
  quota_used: number
  webhook_url: string | null
  createdAt?: string
  updatedAt?: string
  created_at?: string  // Backend might use snake_case
  updated_at?: string  // Backend might use snake_case
}

// Verification Types
export type VerificationType = 'document' | 'biometric' | 'address' | 'government_data'
export type VerificationStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'expired' | 'needs_review'

export interface Verification {
  id: string
  verificationId?: string
  verification_id?: string  // Backend might use snake_case
  externalVerificationId?: string  // IDmeta verification ID
  external_verification_id?: string  // Backend might use snake_case
  verificationType: VerificationType
  status: VerificationStatus
  provider: string | Provider | null  // Can be string ID or populated Provider object
  userEmail: string
  userPhone: string | null
  sessionUrl?: string | null
  session_url?: string | null  // Backend might use snake_case
  statusUrl?: string
  status_url?: string  // Backend might use snake_case
  websocketChannel?: string
  websocket_channel?: string  // Backend might use snake_case
  expiresAt?: string | null
  expires_at?: string | null  // Backend might use snake_case
  result: any | null
  tenantId?: string
  tenant_id?: string  // Backend might use snake_case
  accountId?: string | null
  account_id?: string | null  // Backend might use snake_case
  createdAt?: string
  updatedAt?: string
  created_at?: string  // Backend might use snake_case
  updated_at?: string  // Backend might use snake_case
}

export interface VerificationInitiateRequest {
  verificationType: VerificationType
  userEmail: string
  userPhone?: string
  metadata?: {
    firstName?: string
    lastName?: string
    idNumber?: string
    dateOfBirth?: string
    testMode?: boolean
  }
  templateId?: string
  callbackUrl?: string
}

export interface VerificationInitiateResponse {
  verificationId?: string
  verification_id?: string  // Backend might use snake_case
  externalVerificationId?: string  // IDmeta verification ID
  external_verification_id?: string  // Backend might use snake_case
  status: VerificationStatus
  sessionUrl?: string
  session_url?: string  // Backend might use snake_case
  statusUrl?: string
  status_url?: string  // Backend might use snake_case
  websocketChannel?: string
  websocket_channel?: string  // Backend might use snake_case
  expiresAt?: string
  expires_at?: string  // Backend might use snake_case
}

// Account Types
export interface Account {
  id: string
  email: string
  name: string | null
  phone: string | null
  verification_status: VerificationStatus
  reference_id: string | null
  tenantId: string
  createdAt?: string
  updatedAt?: string
  created_at?: string  // Backend might use snake_case
  updated_at?: string  // Backend might use snake_case
}

// Provider Types (Centralized Credentials Architecture)
export type ProviderType = 'single_step' | 'multi_step' | 'async_webhook'

export interface Provider {
  id: string
  name: string
  provider_id?: string
  type?: ProviderType
  status: 'active' | 'inactive'
  
  // Centralized credentials (super admin only)
  base_url?: string
  api_key?: string
  secret_key?: string
  webhook_secret?: string
  api_version?: string
  
  // Credential status indicators (for list view)
  api_key_set?: boolean
  secret_key_set?: boolean
  webhook_secret_set?: boolean
  
  // Provider capabilities
  supports_webhooks?: boolean
  supports_multi_step?: boolean
  supports_hosted_workflow?: boolean
  
  // Additional configuration (timeouts, retries, etc.)
  config?: Record<string, any>
  
  // Webhook endpoint (auto-generated, read-only)
  webhook_endpoint?: string
  
  createdAt?: string
  updatedAt?: string
  created_at?: string  // Backend might use snake_case
  updated_at?: string  // Backend might use snake_case
  is_active?: boolean  // Backend might use snake_case
}

export interface UpdateProviderRequest {
  name?: string
  type?: ProviderType
  status?: 'active' | 'inactive'
  base_url?: string
  api_key?: string
  secret_key?: string
  webhook_secret?: string
  api_version?: string
  supports_webhooks?: boolean
  supports_multi_step?: boolean
  supports_hosted_workflow?: boolean
  config?: Record<string, any>
  is_active?: boolean
}

// Tenant Provider Assignment (replaces old ProviderConfig)
export interface TenantProviderAssignment {
  id: string
  assignment_id?: string
  tenant_id: string
  provider_id: string
  provider?: Provider  // Populated provider data
  priority: number
  is_enabled: boolean
  tenant_overrides?: Record<string, any> | null
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
}

// Legacy ProviderConfig (deprecated, keeping for backwards compatibility)
export interface ProviderConfig {
  id: string
  tenant_id: string
  provider_id: string
  is_active: boolean
  priority: number
  config?: Record<string, any>
  webhook_endpoint?: string
  webhook_secret_set?: boolean
  createdAt: string
  updatedAt: string
}

// API Key Types
export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  userId: string
  tenantId: string
  createdAt?: string
  updatedAt?: string
  created_at?: string  // Backend might use snake_case
  updated_at?: string  // Backend might use snake_case
}

export interface CreateApiKeyRequest {
  name: string
  scopes?: string[]
  expires_in_days?: number
}

export interface CreateApiKeyResponse extends ApiKey {
  api_key: string // Only returned on creation
}

// Dashboard Stats Types
export interface SuperAdminDashboardStats {
  tenants: {
    total: number
    active: number
    suspended: number
  }
  users: {
    total: number
    superAdmins?: number
    super_admins?: number  // Backend might use snake_case
    tenantAdmins?: number
    tenant_admins?: number  // Backend might use snake_case
    tenantUsers?: number
    tenant_users?: number  // Backend might use snake_case
  }
  providers: {
    total: number
    active: number
  }
  verifications: {
    total: number
    pending: number
    approved: number
    rejected: number
    needsReview?: number
    needs_review?: number  // Backend might use snake_case
  }
}

export interface TenantDashboardStats {
  verifications: {
    total: number
    pending: number
    approved: number
    rejected: number
    needsReview?: number
    needs_review?: number  // Backend might use snake_case
  }
  quota: {
    used: number
    limit: number
    remaining: number
  }
}

// WebSocket Types
export interface WebSocketMessage {
  verificationId?: string
  verification_id?: string  // Backend might use snake_case
  externalVerificationId?: string  // IDmeta verification ID
  external_verification_id?: string  // Backend might use snake_case
  status: VerificationStatus
  provider: string
  updatedAt?: string
  updated_at?: string  // Backend might use snake_case
  result?: any
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[]
  page: number
  limit: number
  total: number
  totalPages: number
}

// API Error Types
export interface ApiError {
  message: string
  statusCode: number
  error?: string
  timestamp?: string
}

// Document Verification
export interface DocumentVerificationRequest {
  templateId: string
  imageFrontSide: string // data URL base64 with prefix
  imageBackSide?: string // optional data URL base64 with prefix
}

export interface DocumentVerificationResponse {
  id: string
  status: 'pending' | 'processing' | 'approved' | 'rejected'
}

// Government Data Verification Types
export interface GovernmentDataVerificationResponse {
  id: string
  status: 'pending' | 'processing' | 'approved' | 'rejected'
}

// PH LTO Drivers License Verification
export interface PhLtoDriversLicenseRequest {
  verificationId: string
  templateId: string
  licenseNo: string
}

// PH National Police Clearance Verification
export interface PhNationalPoliceRequest {
  verificationId: string
  templateId: string
  surname: string
  clearanceNo: string
}

// PH NBI Clearance Verification
export interface PhNbiRequest {
  verificationId: string
  templateId: string
  clearanceNo: string
}

// PH PRC License Verification (supports two search methods)
export interface PhPrcRequestByLicense {
  verificationId: string
  templateId: string
  profession: string
  licenseNo: string
  dateOfBirth: string // Format: YYYY-MM-DD
}

export interface PhPrcRequestByName {
  verificationId: string
  templateId: string
  profession: string
  firstName: string
  lastName: string
}

export type PhPrcRequest = PhPrcRequestByLicense | PhPrcRequestByName

// PH SSS Number Verification
export interface PhSssRequest {
  verificationId: string
  templateId: string
  crnSsNumber: string
}

// Biometrics Face Match
export interface BiometricsFaceMatchRequest {
  verificationId: string
  templateId: string
  image1: string // base64 data URI: "data:image/jpeg;base64,..."
  image2: string // base64 data URI: "data:image/jpeg;base64,..."
}

export interface BiometricsFaceMatchResponse {
  id: string
  status: 'approved' | 'rejected' | 'processing'
}

// Biometrics Registration
export interface BiometricsRegistrationRequest {
  verificationId: string
  templateId: string
  username: string
  image: string // base64 data URI: "data:image/jpeg;base64,..."
}

export interface BiometricsRegistrationResponse {
  id: string
  status: 'approved' | 'rejected' | 'processing'
}

// Biometric Verification
export interface BiometricVerificationRequest {
  verificationId: string
  templateId: string
  image: string // base64 data URI: "data:image/jpeg;base64,..." (recommended)
  imageBase64?: string // Alternative: base64 string without data URI prefix
}

export interface BiometricVerificationResponse {
  id: string
  status: 'approved' | 'rejected' | 'processing'
}

// Custom Document Verification
export interface CustomDocumentVerificationRequest {
  verificationId: string
  templateId: string
  document?: string // Optional: base64 data URI (PNG, JPEG, PDF supported)
}

export interface CustomDocumentVerificationResponse {
  id: string
  status: 'approved' | 'rejected' | 'processing'
}

// Template/Plan Types
export interface TemplateMapping {
  id: number
  name: string
  workflow_id: string
  dropzone_plans: number[]
}

export interface PlanMapping {
  id: number
  plan: string
}

