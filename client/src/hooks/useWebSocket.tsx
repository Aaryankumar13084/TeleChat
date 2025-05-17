import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { queryClient } from '@/lib/queryClient';

interface WebSocketOptions {
  onMessage?: (data: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnected?: () => void;
}

export const useWebSocket = (options: WebSocketOptions = {}) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, Record<number, boolean>>>({});
  
  const socket = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // Base delay in ms
  
  // Create WebSocket connection
  const connect = useCallback(() => {
    if (!token || isConnecting || isConnected || socket.current) return;
    
    setIsConnecting(true);
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket.current = new WebSocket(wsUrl);
    
    socket.current.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;
      
      // Send authentication message
      if (user && socket.current) {
        socket.current.send(JSON.stringify({
          type: 'user',
          payload: {
            auth: true,
            userId: user.id
          }
        }));
      }
      
      options.onConnected?.();
      
      if (reconnectAttempts.current > 0) {
        // This was a reconnection
        options.onReconnected?.();
        
        // Refetch data after reconnect
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    };
    
    socket.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle typing indicators
        if (data.type === 'typing') {
          const { conversationId, userId, isTyping } = data.payload;
          
          setTypingUsers(prev => {
            const conversationTyping = prev[conversationId] || {};
            return {
              ...prev,
              [conversationId]: {
                ...conversationTyping,
                [userId]: isTyping
              }
            };
          });
        }
        
        // Pass message to optional handler
        options.onMessage?.(data);
        
        // Handle new messages and update cache
        if (data.type === 'message') {
          const { message } = data.payload;
          
          // Update messages cache
          queryClient.setQueryData(['/api/messages', message.conversationId], (oldData: any) => {
            if (Array.isArray(oldData)) {
              return [...oldData, message];
            }
            return [message];
          });
          
          // Invalidate the conversations query to update the last message
          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        }
        
        // Handle message status updates
        if (data.type === 'status') {
          // Could update a specific message's status in the cache
          const { messageId, userId, isRead } = data.payload;
          
          // This would require more complex cache manipulation
          // Would need to update a specific message within a conversation's messages
        }
        
        // Handle user status updates
        if (data.type === 'user' && !data.payload.auth) {
          const { userId, isOnline } = data.payload;
          
          // Update user status in conversations
          queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    socket.current.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      socket.current = null;
      
      // Try to reconnect
      if (token && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current += 1;
        
        // Exponential backoff for reconnect
        const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts.current - 1);
        
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, delay);
      }
      
      options.onDisconnected?.();
    };
    
    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.current?.close();
    };
  }, [token, isConnecting, isConnected, user, options]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (socket.current) {
      socket.current.close();
      socket.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    
    // Clear any reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);
  
  // Send a message through WebSocket
  const sendMessage = useCallback((type: string, payload: any) => {
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, []);
  
  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    sendMessage('typing', { conversationId, isTyping });
  }, [sendMessage]);
  
  // Connect/disconnect based on auth status
  useEffect(() => {
    if (token) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);
  
  return {
    isConnected,
    isConnecting,
    sendMessage,
    sendTypingIndicator,
    typingUsers,
    connect,
    disconnect
  };
};
