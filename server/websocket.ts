import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { WSMessage, Message } from '@shared/schema';
import { log } from './vite';
import { storage } from './storage';
import { getAuthUser } from './auth';
import { Request } from 'express';
import mongoose from 'mongoose';

interface Client {
  userId: number | string;
  ws: WebSocket;
}

export class ChatWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();

  constructor(server: Server) {
    // Create WebSocket server with a unique path to avoid conflicts
    this.wss = new WebSocketServer({ server, path: '/chat-ws' });
    
    this.wss.on('connection', async (ws: WebSocket, request: Request) => {
      log('WebSocket connection established', 'websocket');
      
      // Get user from auth token
      const user = getAuthUser(request);
      const userId = user?.id || null;
      
      if (userId) {
        // Convert to string ID to ensure consistency
        const userIdStr = userId.toString();
        // Store client connection
        this.clients.set(userIdStr, { userId, ws });
        
        // Update user's online status
        if (user) {
          await storage.updateUser(userId, { isOnline: true });
          this.broadcastUserStatus(userId, true);
        }
        
        // Send initial data to client
        ws.send(JSON.stringify({
          type: 'connected',
          payload: { userId }
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Authentication required' }
        }));
      }
      
      // Handle client messages
      ws.on('message', async (message: string) => {
        try {
          const parsedMessage = JSON.parse(message) as WSMessage;
          await this.handleMessage(ws, parsedMessage, userId);
        } catch (error) {
          log(`Error processing WebSocket message: ${error}`, 'websocket');
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Failed to process message' }
          }));
        }
      });
      
      // Handle client disconnection
      ws.on('close', async () => {
        log('WebSocket connection closed', 'websocket');
        
        if (userId) {
          const userIdStr = userId.toString();
          this.clients.delete(userIdStr);
          
          // Update user's online status and last seen time
          await storage.updateUser(userId, {
            isOnline: false,
            lastSeen: new Date()
          });
          
          this.broadcastUserStatus(userId, false);
        }
      });
    });
    
    log('WebSocket server initialized', 'websocket');
  }
  
  private async handleMessage(ws: WebSocket, message: WSMessage, userId: number | string | null): Promise<void> {
    if (!userId) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Authentication required' }
      }));
      return;
    }
    
    switch (message.type) {
      case 'chat_message':
        await this.handleChatMessage(message.payload, userId);
        break;
        
      case 'typing_indicator':
        await this.handleTypingIndicator(message.payload, userId);
        break;
        
      case 'message_status':
        await this.handleMessageStatus(message.payload, userId);
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Unknown message type' }
        }));
    }
  }
  
  private async handleChatMessage(payload: any, userId: number | string | null): Promise<void> {
    if (!userId || !payload.conversationId) return;
    
    try {
      // Log for debugging
      log(`Creating message from user ${userId} in conversation ${payload.conversationId}`, 'websocket');
      
      // Convert conversation and user IDs to match MongoDB expected format
      const convId = typeof payload.conversationId === 'string' && mongoose.Types.ObjectId.isValid(payload.conversationId) ? 
        payload.conversationId : payload.conversationId;
      
      const senderId = typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId) ? 
        userId : userId;
      
      // Create new message in storage with the proper status field
      const messageData: any = {
        conversationId: convId,
        userId: senderId,
        content: payload.content || null,
        mediaUrl: payload.mediaUrl || null,
        mediaType: payload.mediaType || null,
        status: 'sent'
      };
      
      const message = await storage.createMessage(messageData);
      
      // Get all participants in the conversation
      const participants = await storage.getParticipantsByConversationId(payload.conversationId);
      
      // Create message status for all participants
      for (const participant of participants) {
        await storage.createMessageStatus({
          messageId: message.id,
          userId: participant.userId,
          isRead: participant.userId === userId
        });
      }
      
      // Broadcast message to all online participants
      for (const participant of participants) {
        if (participant.userId !== userId) {
          this.sendToUser(participant.userId, {
            type: 'new_message',
            payload: {
              message,
              conversationId: payload.conversationId
            }
          });
        }
      }
      
      // Send confirmation to sender
      this.sendToUser(userId, {
        type: 'message_sent',
        payload: {
          message,
          conversationId: payload.conversationId
        }
      });
    } catch (error) {
      log(`Error handling chat message: ${error}`, 'websocket');
    }
  }
  
  private async handleTypingIndicator(payload: any, userId: number | null): Promise<void> {
    if (!userId || !payload.conversationId) return;
    
    try {
      // Get all participants in the conversation
      const participants = await storage.getParticipantsByConversationId(payload.conversationId);
      
      // Broadcast typing indicator to all online participants except sender
      for (const participant of participants) {
        if (participant.userId !== userId) {
          this.sendToUser(participant.userId, {
            type: 'typing_indicator',
            payload: {
              userId,
              conversationId: payload.conversationId,
              isTyping: payload.isTyping
            }
          });
        }
      }
    } catch (error) {
      log(`Error handling typing indicator: ${error}`, 'websocket');
    }
  }
  
  private async handleMessageStatus(payload: any, userId: number | null): Promise<void> {
    if (!userId || !payload.messageId) return;
    
    try {
      // Update message status in storage
      await storage.updateMessageStatus(
        payload.messageId,
        userId,
        payload.isRead || false
      );
      
      // Get the message
      const message = await storage.getMessage(payload.messageId);
      
      if (message) {
        // Notify the sender about the status change
        this.sendToUser(message.userId, {
          type: 'message_status_update',
          payload: {
            messageId: payload.messageId,
            userId,
            isRead: payload.isRead || false,
            conversationId: message.conversationId
          }
        });
      }
    } catch (error) {
      log(`Error handling message status: ${error}`, 'websocket');
    }
  }
  
  private async broadcastUserStatus(userId: number, isOnline: boolean): Promise<void> {
    // Get all conversations for the user
    const conversations = await storage.getConversationsByUserId(userId);
    
    for (const conversation of conversations) {
      // Get all participants in the conversation
      const participants = await storage.getParticipantsByConversationId(conversation.id);
      
      // Notify all online participants except the user
      for (const participant of participants) {
        if (participant.userId !== userId) {
          this.sendToUser(participant.userId, {
            type: 'user_status_change',
            payload: {
              userId,
              isOnline,
              lastSeen: isOnline ? null : new Date()
            }
          });
        }
      }
    }
  }
  
  public sendToUser(userId: number | string, data: any): void {
    // Convert userId to string for map lookup
    const userIdStr = userId.toString();
    const client = this.clients.get(userIdStr);
    
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    } else {
      log(`Cannot send message to user ${userIdStr} - not connected or socket not open`, 'websocket');
    }
  }
  
  public broadcast(data: any): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}