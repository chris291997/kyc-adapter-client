import { io, Socket } from 'socket.io-client'
import { WS_URL, WS_EVENTS, STORAGE_KEYS } from '../constants'
import type { WebSocketMessage } from '../types'

type MessageHandler = (data: WebSocketMessage) => void

class WebSocketService {
  private socket: Socket | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return
    }

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (!token) {
      console.error('No auth token available for WebSocket connection')
      return
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    })

    this.setupEventListeners()
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on(WS_EVENTS.CONNECT, () => {
      this.reconnectAttempts = 0
    })

    this.socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket?.connect()
      }
    })

    this.socket.on(WS_EVENTS.VERIFICATION_STATUS_UPDATE, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.VERIFICATION_STATUS_UPDATE, data)
    })

    this.socket.on(WS_EVENTS.VERIFICATION_COMPLETED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.VERIFICATION_COMPLETED, data)
    })

    // Listen for backend event format (with dots instead of colons)
    this.socket.on('verification.completed', (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.VERIFICATION_COMPLETED, data)
      // Also directly route to verification-specific handlers
      const verificationId = (data as any).verificationId || (data as any).verification_id || (data as any).data?.verificationId
      if (verificationId) {
        const key = `verification:${verificationId}`
        const verificationHandlers = this.handlers.get(key)
        if (verificationHandlers) {
          verificationHandlers.forEach((handler) => handler(data))
        }
      }
    })

    this.socket.on('verification.status_update', (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.VERIFICATION_STATUS_UPDATE, data)
      // Also directly route to verification-specific handlers
      const verificationId = (data as any).verificationId || (data as any).verification_id || (data as any).data?.verificationId
      if (verificationId) {
        const key = `verification:${verificationId}`
        const verificationHandlers = this.handlers.get(key)
        if (verificationHandlers) {
          verificationHandlers.forEach((handler) => handler(data))
        }
      }
    })

    // Admin events
    this.socket.on(WS_EVENTS.TENANT_CREATED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.TENANT_CREATED, data)
    })

    this.socket.on(WS_EVENTS.TENANT_UPDATED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.TENANT_UPDATED, data)
    })

    this.socket.on(WS_EVENTS.PROVIDER_CREATED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.PROVIDER_CREATED, data)
    })

    this.socket.on(WS_EVENTS.PROVIDER_UPDATED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.PROVIDER_UPDATED, data)
    })

    this.socket.on(WS_EVENTS.USER_CREATED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.USER_CREATED, data)
    })

    this.socket.on(WS_EVENTS.USER_UPDATED, (data: WebSocketMessage) => {
      this.handleMessage(WS_EVENTS.USER_UPDATED, data)
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.reconnectAttempts++
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
      }
    })
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: string, data: WebSocketMessage): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }

    // Also trigger verification-specific handlers
    const verificationId = (data as any).verificationId || (data as any).verification_id || (data as any).data?.verificationId
    if (verificationId) {
      const key = `verification:${verificationId}`
      const verificationHandlers = this.handlers.get(key)
      if (verificationHandlers) {
        verificationHandlers.forEach((handler) => handler(data))
      }
    }

    // Also trigger tenant-specific handlers
    const tenantId = (data as any).tenantId || (data as any).tenant_id
    if (tenantId) {
      const tenantHandlers = this.handlers.get(`tenant:${tenantId}`)
      if (tenantHandlers) {
        tenantHandlers.forEach((handler) => handler(data))
      }
    }
  }

  /**
   * Subscribe to verification updates
   */
  subscribeToVerification(verificationId: string, handler: MessageHandler): () => void {
    const key = `verification:${verificationId}`
    
    // Add handler to map
    if (!this.handlers.has(key)) {
      this.handlers.set(key, [])
    }
    this.handlers.get(key)!.push(handler)

    // Join verification room
    if (this.socket?.connected) {
      this.socket.emit(WS_EVENTS.JOIN_VERIFICATION, { verificationId })
    } else {
      console.warn(`⚠️ WebSocket not connected. Cannot join verification room: ${verificationId}`)
    }

    // Return unsubscribe function
    return () => this.unsubscribeFromVerification(verificationId, handler)
  }

  /**
   * Unsubscribe from verification updates
   */
  private unsubscribeFromVerification(verificationId: string, handler: MessageHandler): void {
    const key = `verification:${verificationId}`
    const handlers = this.handlers.get(key)
    
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
      
      if (handlers.length === 0) {
        this.handlers.delete(key)
        this.socket?.emit(WS_EVENTS.LEAVE_VERIFICATION, verificationId)
      }
    }
  }

  /**
   * Subscribe to tenant updates
   */
  subscribeToTenant(tenantId: string, handler: MessageHandler): () => void {
    const handlers = this.handlers.get(`tenant:${tenantId}`) || []
    if (handlers.length === 0) {
      this.socket?.emit(WS_EVENTS.JOIN_TENANT, tenantId)
    }
    
    this.handlers.set(`tenant:${tenantId}`, [...handlers, handler])

    // Return unsubscribe function
    return () => {
      const tenantHandlers = this.handlers.get(`tenant:${tenantId}`)
      if (tenantHandlers) {
        const index = tenantHandlers.indexOf(handler)
        if (index > -1) {
          tenantHandlers.splice(index, 1)
        }
        
        if (tenantHandlers.length === 0) {
          this.handlers.delete(`tenant:${tenantId}`)
          this.socket?.emit(WS_EVENTS.LEAVE_TENANT, tenantId)
        }
      }
    }
  }

  /**
   * Subscribe to general events
   */
  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.handlers.clear()
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.error('Cannot emit event: WebSocket not connected')
    }
  }
}

export const websocketService = new WebSocketService()

