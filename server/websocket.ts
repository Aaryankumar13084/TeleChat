import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { wsMessageSchema, WSMessage, Message } from '@shared/schema';

// Define client interface to track authenticated users
interface Client {
  userId: number;
  ws: WebSocket;
}

export class ChatWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<number, Client> = new Map();
  
  constructor(server: Server) {
    // Initialize WebSocket server on a specific path to avoid conflicts with Vite HMR
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws) => {
      console.log('WebSocket connection established');
      
      // Set empty userId initially
      let userId: number | null = null;
      
      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          const validatedData = wsMessageSchema.parse(data);
          
          await this.handleMessage(ws, validatedData, userId);
          
          // If authentication message, update the userId
          if (validatedData.type === 'user' && validatedData.payload.auth) {
            userId = validatedData.payload.userId;
            
            // Store client connection
            if (userId) {
              this.clients.set(userId, { userId, ws });
              
              // Update user status to online
              await storage.updateUser(userId, { isOnline: true });
              
              // Broadcast user online status to other users
              this.broadcastUserStatus(userId, true);
            }
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            payload: { message: 'Invalid message format' }
          }));
        }
      });
      
      ws.on('close', async () => {
        console.log('WebSocket connection closed');
        
        // If user was authenticated, remove from clients and update status
        if (userId) {
          this.clients.delete(userId);
          
          // Update user status to offline
          const now = new Date();
          await storage.updateUser(userId, { isOnline: false, lastSeen: now });
          
          // Broadcast user offline status to other users
          this.broadcastUserStatus(userId, false);
        }
      });
      
      // Send initial connection confirmation
      ws.send(JSON.stringify({
        type: 'connection',
        payload: { status: 'connected' }
      }));
    });
  }
  
  // Handle different message types
  private async handleMessage(ws: WebSocket, message: WSMessage, userId: number | null): Promise<void> {
    switch (message.type) {
      case 'message':
        await this.handleChatMessage(message.payload, userId);
        break;
      case 'typing':
        await this.handleTypingIndicator(message.payload, userId);
        break;
      case 'status':
        await this.handleMessageStatus(message.payload, userId);
        break;
      default:
        // Other message types are handled in the connection handler
        break;
    }
  }
  
  // Handle new chat messages
  private async handleChatMessage(payload: any, userId: number | null): Promise<void> {
    if (!userId) return;
    
    const { conversationId, content, mediaUrl, mediaType } = payload;
    
    // Create new message in storage
    const message = await storage.createMessage({
      conversationId,
      userId,
      content,
      mediaUrl,
      mediaType
    });
    
    // Get all participants of this conversation
    const participants = await storage.getParticipantsByConversationId(conversationId);
    
    // Create message status entries for all participants
    for (const participant of participants) {
      await storage.createMessageStatus({
        messageId: message.id,
        userId: participant.userId,
        isRead: participant.userId === userId // Message is read by sender
      });
    }
    
    // Send message to all online participants except the sender
    participants.forEach(participant => {
      if (participant.userId !== userId) {
        const client = this.clients.get(participant.userId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'message',
            payload: { message }
          }));
        }
      }
    });
  }
  
  // Handle typing indicators
  private async handleTypingIndicator(payload: any, userId: number | null): Promise<void> {
    if (!userId) return;
    
    const { conversationId, isTyping } = payload;
    
    // Get all participants of this conversation
    const participants = await storage.getParticipantsByConversationId(conversationId);
    
    // Send typing indicator to all online participants except the sender
    participants.forEach(participant => {
      if (participant.userId !== userId) {
        const client = this.clients.get(participant.userId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'typing',
            payload: {
              conversationId,
              userId,
              isTyping
            }
          }));
        }
      }
    });
  }
  
  // Handle message status updates (read receipts)
  private async handleMessageStatus(payload: any, userId: number | null): Promise<void> {
    if (!userId) return;
    
    const { messageId, isRead } = payload;
    
    // Update message status in storage
    const messageStatus = await storage.updateMessageStatus(messageId, userId, isRead);
    
    if (!messageStatus) return;
    
    // Get the message
    const message = await storage.getMessage(messageId);
    
    if (!message) return;
    
    // If user reading the message is not the sender, notify the sender
    if (message.userId !== userId) {
      const senderClient = this.clients.get(message.userId);
      if (senderClient && senderClient.ws.readyState === WebSocket.OPEN) {
        senderClient.ws.send(JSON.stringify({
          type: 'status',
          payload: {
            messageId,
            userId,
            isRead
          }
        }));
      }
    }
  }
  
  // Broadcast user online/offline status to relevant users
  private async broadcastUserStatus(userId: number, isOnline: boolean): Promise<void> {
    // Find all conversations this user is part of
    const conversations = await storage.getConversationsByUserId(userId);
    
    // For each conversation, notify all other online participants
    for (const conversation of conversations) {
      const participants = await storage.getParticipantsByConversationId(conversation.id);
      
      participants.forEach(participant => {
        if (participant.userId !== userId) {
          const client = this.clients.get(participant.userId);
          if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: 'user',
              payload: {
                userId,
                isOnline,
                lastSeen: isOnline ? new Date() : null
              }
            }));
          }
        }
      });
    }
  }
  
  // Send message to specific user
  public sendToUser(userId: number, data: any): void {
    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }
  
  // Broadcast message to all connected clients
  public broadcast(data: any): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}
