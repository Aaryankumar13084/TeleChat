import { useState, useEffect, useCallback, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from './useAuth';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user, token } = useAuth();
  
  // Create a WebSocket connection
  const connect = useCallback(() => {
    if (!user || !token) return;
    
    try {
      // Close existing connection if any
      if (socket) {
        socket.close();
      }
      
      // Determine WebSocket URL (ws or wss based on page protocol)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
      
      console.log('Connecting to WebSocket server:', wsUrl);
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setError(null);
      };
      
      newSocket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setIsConnected(false);
        
        // Attempt to reconnect unless we've maxed out our attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`Attempting to reconnect (${reconnectAttempts.current + 1}/${maxReconnectAttempts})...`);
          
          // Exponential backoff for reconnect
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        } else {
          setError(new Error('Failed to connect to WebSocket server after several attempts'));
        }
      };
      
      newSocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle different types of messages
          switch (data.type) {
            case 'chat_message':
              handleNewMessage(data.payload);
              break;
            case 'typing':
              handleTypingIndicator(data.payload);
              break;
            case 'message_deleted':
              handleMessageDeleted(data.payload);
              break;
            case 'read_receipt':
              handleReadReceipt(data.payload);
              break;
            case 'user_status':
              handleUserStatus(data.payload);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      setError(error instanceof Error ? error : new Error('Unknown error establishing WebSocket connection'));
    }
  }, [user, token]);
  
  // Handle incoming messages
  const handleNewMessage = (payload: any) => {
    const { conversationId } = payload;
    
    if (!conversationId) return;
    
    // Update the messages cache
    queryClient.setQueryData(['/api/messages', conversationId], (oldData: any[] = []) => {
      // Check if message already exists to avoid duplication
      if (!oldData.some(msg => msg.id === payload.id)) {
        return [...oldData, payload];
      }
      return oldData;
    });
    
    // Update conversations list to show latest message
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
  };
  
  // Handle typing indicators
  const handleTypingIndicator = (payload: any) => {
    // Just notify any listeners - this is ephemeral state, no need to cache
    const event = new CustomEvent('typing_indicator', { detail: payload });
    window.dispatchEvent(event);
  };
  
  // Handle message deletion
  const handleMessageDeleted = (payload: any) => {
    const { conversationId, messageId } = payload;
    
    if (!conversationId || !messageId) return;
    
    // Update messages cache to remove the deleted message
    queryClient.setQueryData(['/api/messages', conversationId], (oldData: any[] = []) => {
      return oldData.filter(msg => msg.id !== messageId);
    });
    
    // Update conversations list as the last message might have changed
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
  };
  
  // Handle read receipts
  const handleReadReceipt = (payload: any) => {
    const { conversationId, messageId, userId } = payload;
    
    if (!conversationId || !messageId) return;
    
    // Update message status in the cache
    queryClient.setQueryData(['/api/messages', conversationId], (oldData: any[] = []) => {
      return oldData.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, status: 'read' };
        }
        return msg;
      });
    });
  };
  
  // Handle user status changes
  const handleUserStatus = (payload: any) => {
    const { userId, isOnline, lastSeen } = payload;
    
    if (!userId) return;
    
    // Broadcast user status changes to any interested components
    const event = new CustomEvent('user_status_change', { detail: payload });
    window.dispatchEvent(event);
    
    // Update the user data in conversations if available
    queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
  };
  
  // Send a message via WebSocket
  const sendMessage = useCallback((type: string, payload: any) => {
    if (isConnected && socket) {
      try {
        const message = { type, payload };
        socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
  }, [isConnected, socket]);
  
  // Initialize WebSocket connection when user/token changes
  useEffect(() => {
    if (user && token) {
      connect();
    }
    
    return () => {
      // Clean up on unmount
      if (socket) {
        socket.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, token, connect]);
  
  // Send typing indicator
  const sendTyping = useCallback((conversationId: number | string, isTyping: boolean) => {
    return sendMessage('typing', { conversationId, isTyping });
  }, [sendMessage]);
  
  // Send read receipt
  const sendReadReceipt = useCallback((messageId: number | string) => {
    return sendMessage('read_receipt', { messageId, isRead: true });
  }, [sendMessage]);
  
  // Send message deletion request
  const sendDeleteMessage = useCallback((messageId: number | string, conversationId: number | string) => {
    return sendMessage('delete_message', { messageId, conversationId });
  }, [sendMessage]);
  
  return {
    isConnected,
    error,
    sendMessage,
    sendTyping,
    sendReadReceipt,
    sendDeleteMessage,
    reconnect: connect
  };
};