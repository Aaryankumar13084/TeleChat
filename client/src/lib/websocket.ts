import { WSMessage } from '@shared/schema';

type MessageHandler = (data: any) => void;
type ConnectionStatusHandler = (isConnected: boolean) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionStatusHandlers: Set<ConnectionStatusHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  
  constructor() {
    // Initialize handlers for all message types
    this.messageHandlers.set('connected', new Set());
    this.messageHandlers.set('error', new Set());
    this.messageHandlers.set('new_message', new Set());
    this.messageHandlers.set('message_sent', new Set());
    this.messageHandlers.set('typing_indicator', new Set());
    this.messageHandlers.set('message_status_update', new Set());
    this.messageHandlers.set('user_status_change', new Set());
  }
  
  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.socket) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionStatusHandlers(true);
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type) {
          this.notifyMessageHandlers(data.type, data.payload || {});
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      this.isConnected = false;
      this.socket = null;
      this.notifyConnectionStatusHandlers(false);
      this.attemptReconnect();
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
      this.notifyConnectionStatusHandlers(false);
    };
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.notifyConnectionStatusHandlers(false);
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }
  
  /**
   * Send a message to the WebSocket server
   */
  send(message: WSMessage): void {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }
  
  /**
   * Register a handler for a specific message type
   */
  on(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)?.add(handler);
  }
  
  /**
   * Unregister a handler for a specific message type
   */
  off(type: string, handler: MessageHandler): void {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type)?.delete(handler);
    }
  }
  
  /**
   * Register a connection status handler
   */
  onConnectionStatus(handler: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.add(handler);
  }
  
  /**
   * Unregister a connection status handler
   */
  offConnectionStatus(handler: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.delete(handler);
  }
  
  /**
   * Check if the WebSocket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Notify all handlers for a specific message type
   */
  private notifyMessageHandlers(type: string, data: any): void {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type)?.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${type} handler:`, error);
        }
      });
    }
  }
  
  /**
   * Notify all connection status handlers
   */
  private notifyConnectionStatusHandlers(isConnected: boolean): void {
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(isConnected);
      } catch (error) {
        console.error('Error in connection status handler:', error);
      }
    });
  }
  
  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached');
    }
  }
  
  // Helper methods for common message types
  
  /**
   * Send a chat message
   */
  sendChatMessage(conversationId: number, content: string, mediaUrl?: string, mediaType?: string): void {
    this.send({
      type: 'chat_message',
      payload: {
        conversationId,
        content,
        mediaUrl,
        mediaType
      }
    });
  }
  
  /**
   * Send a typing indicator
   */
  sendTypingIndicator(conversationId: number, isTyping: boolean): void {
    this.send({
      type: 'typing_indicator',
      payload: {
        conversationId,
        isTyping
      }
    });
  }
  
  /**
   * Update message status (read/unread)
   */
  updateMessageStatus(messageId: number, isRead: boolean): void {
    this.send({
      type: 'message_status',
      payload: {
        messageId,
        isRead
      }
    });
  }
}

// Create a singleton instance
export const wsClient = new WebSocketClient();

// Export the class for testing purposes
export default WebSocketClient;