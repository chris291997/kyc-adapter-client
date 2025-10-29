import { apiClient } from './apiClient'
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants'
import type { AuthResponse, CreateApiKeyRequest, CreateApiKeyResponse, ApiKey } from '../types'

class AuthService {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.LOGIN, {
      email,
      password,
    })

    this.storeAuthData(response)
    return response
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.REFRESH, {
      refresh_token: refreshToken,
    })

    this.storeAuthData(response)
    return response
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    apiClient.removeApiKey()
  }

  /**
   * Store authentication data in localStorage
   */
  private storeAuthData(data: AuthResponse): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user))
  }

  /**
   * Get authentication headers for API calls
   */
  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER)
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Create API key
   */
  async createApiKey(data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return apiClient.post<CreateApiKeyResponse>(API_ENDPOINTS.API_KEYS, data)
  }

  /**
   * List API keys
   */
  async listApiKeys(): Promise<ApiKey[]> {
    return apiClient.get<ApiKey[]>(API_ENDPOINTS.API_KEYS)
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    return apiClient.delete(`${API_ENDPOINTS.API_KEYS}/${apiKeyId}`)
  }

  /**
   * Set API key for API-key-only mode
   */
  setApiKey(apiKey: string): void {
    apiClient.setApiKey(apiKey)
  }
}

export const authService = new AuthService()


