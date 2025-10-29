interface JWTPayload {
  sub: string
  email: string
  userType: 'super_admin' | 'tenant_admin' | 'tenant_user'
  tenantId?: string
  iat: number
  exp: number
}

/**
 * Decode JWT token without verification
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token)
  if (!payload) return true
  return Date.now() >= payload.exp * 1000
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpirationTime(token: string): number | null {
  const payload = decodeJWT(token)
  if (!payload) return null
  return payload.exp
}


