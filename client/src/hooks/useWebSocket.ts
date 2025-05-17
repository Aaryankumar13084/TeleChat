import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '@/lib/websocket';
import { useAuth } from '@/hooks/useAuth';

export function useWebSocket() {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const connectionHandlerRef = useRef<((isConnected: boolean) => void) | null>(null);
  
  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      wsClient.connect();
      
      // Set up connection status handler
      connectionHandlerRef.current = (connected: boolean) => {
        setIsConnected(connected);
      };
      
      wsClient.onConnectionStatus(connectionHandlerRef.current);
      
      // Clean up on unmount
      return () => {
        if (connectionHandlerRef.current) {
          wsClient.offConnectionStatus(connectionHandlerRef.current);
        }
      };
    } else {
      // Disconnect when not authenticated
      wsClient.disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated]);
  
  // Add message handler
  const addMessageHandler = useCallback((type: string, handler: (data: any) => void) => {
    wsClient.on(type, handler);
    return () => wsClient.off(type, handler);
  }, []);
  
  // Send chat message
  const sendChatMessage = useCallback((
    conversationId: number, 
    content: string, 
    mediaUrl?: string, 
    mediaType?: string
  ) => {
    if (isConnected) {
      wsClient.sendChatMessage(conversationId, content, mediaUrl, mediaType);
      return true;
    }
    return false;
  }, [isConnected]);
  
  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    if (isConnected) {
      wsClient.sendTypingIndicator(conversationId, isTyping);
      return true;
    }
    return false;
  }, [isConnected]);
  
  // Update message status
  const updateMessageStatus = useCallback((messageId: number, isRead: boolean) => {
    if (isConnected) {
      wsClient.updateMessageStatus(messageId, isRead);
      return true;
    }
    return false;
  }, [isConnected]);
  
  return {
    isConnected,
    addMessageHandler,
    sendChatMessage,
    sendTypingIndicator,
    updateMessageStatus
  };
}