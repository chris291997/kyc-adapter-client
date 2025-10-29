import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../constants'
import type { ApiError } from '../types'

class ApiClient {
  private client: AxiosInstance
  private refreshing = false
  private refreshQueue: Array<() => void> = []

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        const apiKey = localStorage.getItem('api_key') // For API key auth

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        } else if (apiKey && config.headers) {
          config.headers['X-API-Key'] = apiKey
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            // Queue the request until token is refreshed
            return new Promise((resolve) => {
              this.refreshQueue.push(() => {
                resolve(this.client(originalRequest))
              })
            })
          }

          originalRequest._retry = true
          this.refreshing = true

          try {
            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
            if (!refreshToken) {
              throw new Error('No refresh token available')
            }

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            })

            const { access_token, refresh_token } = response.data
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token)
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token)

            // Process queued requests
            this.refreshQueue.forEach((callback) => callback())
            this.refreshQueue = []
            this.refreshing = false

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`
            }
            return this.client(originalRequest)
          } catch (refreshError) {
            // Refresh failed, logout user
            this.refreshing = false
            this.refreshQueue = []
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.USER)
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        // Normalize error response
        const normalizedError: ApiError = {
          message: error.response?.data?.message || error.message || 'An error occurred',
          statusCode: error.response?.status || 500,
          error: error.response?.data?.error,
          timestamp: error.response?.data?.timestamp,
        }

        return Promise.reject(normalizedError)
      }
    )
  }

  // HTTP Methods
  async get<T>(url: string, config = {}) {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config = {}) {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config = {}) {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config = {}) {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config = {}) {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  // Set API key for API-key-only mode
  setApiKey(apiKey: string) {
    localStorage.setItem('api_key', apiKey)
  }

  // Remove API key
  removeApiKey() {
    localStorage.removeItem('api_key')
  }
}

export const apiClient = new ApiClient()


