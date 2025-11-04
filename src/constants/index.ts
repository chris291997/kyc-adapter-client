// API Configuration
// If VITE_ENV is 'test', use Replit backend URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_ENV === 'test') {
    return 'https://d58a3b08-335a-460b-b4c9-241ca526d77d-00-2bhyhl0y9qi5s.sisko.replit.dev:3000'
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000'
}

const getWsUrl = () => {
  if (import.meta.env.VITE_ENV === 'test') {
    return 'wss://d58a3b08-335a-460b-b4c9-241ca526d77d-00-2bhyhl0y9qi5s.sisko.replit.dev:3000'
  }
  return import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
}

export const API_BASE_URL = getApiBaseUrl()
export const WS_URL = getWsUrl()
export const API_KEYS_ONLY = import.meta.env.VITE_API_KEYS_ONLY === 'true'
export const API_KEY = import.meta.env.VITE_IDMETA_API_KEY === 'true'

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
} as const

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  TENANT_USER: 'tenant_user',
} as const

// Verification Types
export const VERIFICATION_TYPES = {
  DOCUMENT: 'document',
  BIOMETRIC: 'biometric',
  ADDRESS: 'address',
  GOVERNMENT_DATA: 'government_data',
  COMPLIANCE: 'compliance', // For biometrics endpoints
  CUSTOMIZE: 'customize', // For custom document endpoints
} as const

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  NEEDS_REVIEW: 'needs_review',
} as const

// Status Colors
export const STATUS_COLORS = {
  pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400',
  processing: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  approved: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  verified: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  rejected: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  expired: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400',
  needs_review: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400',
  active: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  suspended: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  inactive: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-400',
} as const

// Pagination
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// WebSocket Events
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  VERIFICATION_STATUS_UPDATE: 'verification:status_update',
  VERIFICATION_COMPLETED: 'verification:completed',
  JOIN_VERIFICATION: 'join_verification',
  LEAVE_VERIFICATION: 'leave_verification',
  // Admin events
  TENANT_CREATED: 'tenant:created',
  TENANT_UPDATED: 'tenant:updated',
  PROVIDER_CREATED: 'provider:created',
  PROVIDER_UPDATED: 'provider:updated',
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  // Room subscriptions
  JOIN_TENANT: 'join_tenant',
  LEAVE_TENANT: 'leave_tenant',
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  API_KEYS: '/auth/api-keys',
  
  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_TENANTS: '/admin/tenants',
  ADMIN_PROVIDERS: '/admin/providers',
  ADMIN_USERS: '/admin/users',
  
  // Tenant
  TENANT_DASHBOARD: '/tenant/dashboard',
  TENANT_VERIFICATIONS: '/tenant/verifications',
  TENANT_API_KEYS: '/tenant/api-keys',
  TENANT_USERS: '/tenant/users',
  
  // Accounts
  ACCOUNTS: '/accounts',
  
  // Verifications
  VERIFICATIONS_INITIATE: '/verifications/initiate',
  VERIFICATIONS: '/verifications',
  VERIFICATIONS_FINALIZE: '/verifications/finalize',
  VERIFICATIONS_MANUAL_FINALIZE: '/verifications/manual-finalize',
  // PH PhilSys (PCN) - no /api/v1 prefix (API_BASE_URL already points to base)
  PH_PHILSYS_PCN: '/verifications/philippines/philsys/pcn',
  // PH Government Data Verification Endpoints
  PH_LTO_DRIVERS_LICENSE: '/verifications/philippines/lto/drivers-license',
  PH_NATIONAL_POLICE: '/verifications/philippines/national-police',
  PH_NBI: '/verifications/philippines/nbi',
  PH_PRC: '/verifications/philippines/prc',
  PH_SSS: '/verifications/philippines/sss',
  // Biometrics Verification Endpoints
  BIOMETRICS_FACE_MATCH: '/verifications/biometrics/face-match',
  BIOMETRICS_REGISTRATION: '/verifications/biometrics/registration',
  BIOMETRICS_VERIFICATION: '/verifications/biometrics/verification',
  // Custom Document Verification
  CUSTOM_DOCUMENT: '/verifications/custom/document',
} as const

