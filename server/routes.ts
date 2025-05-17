import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from 'ws';
import { ChatWebSocketServer } from './websocket';
import { authMiddleware, getAuthUser, createToken, verifyPassword, hashPassword } from './auth';
import {
  insertUserSchema,
  insertConversationSchema,
  insertParticipantSchema,
  insertMessageSchema
} from '@shared/schema';
import { z } from 'zod';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const chatWss = new ChatWebSocketServer(httpServer);

  // Authentication endpoints
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(6)
      });
      
      const userData = registerSchema.parse(req.body);
      
      // Check if username exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      
      // Check if email exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Create token
      const token = createToken(user);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error during registration' });
    }
  });
  
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Update user status to online
      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });
      
      // Create token
      const token = createToken(user);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error during login' });
    }
  });

  // Protected routes (require authentication)
  // User endpoints
  app.get('/api/users/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.put('/api/users/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const updateSchema = z.object({
        displayName: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional()
      });
      
      const updateData = updateSchema.parse(req.body);
      
      // Update user
      const updatedUser = await storage.updateUser(user.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Conversation endpoints
  app.get('/api/conversations', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get all conversations with participants and last message
      const conversations = await storage.getConversationsWithParticipantsAndLastMessage(user.id);
      
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/conversations', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const createSchema = insertConversationSchema.extend({
        participantIds: z.array(z.number()).min(1) // At least one other participant
      });
      
      const { participantIds, ...conversationData } = createSchema.parse(req.body);
      
      // Create conversation
      const conversation = await storage.createConversation(conversationData);
      
      // Add current user as admin participant
      await storage.addParticipant({
        userId: user.id,
        conversationId: conversation.id,
        isAdmin: true
      });
      
      // Add other participants
      for (const participantId of participantIds) {
        if (participantId !== user.id) { // Don't add current user twice
          await storage.addParticipant({
            userId: participantId,
            conversationId: conversation.id,
            isAdmin: false
          });
        }
      }
      
      // Get full conversation data with participants
      const fullConversation = {
        ...conversation,
        participants: await storage.getParticipantsByConversationId(conversation.id)
      };
      
      res.status(201).json(fullConversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const conversationId = parseInt(req.params.id);
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if user is a participant
      const participant = await storage.getParticipant(user.id, conversationId);
      
      if (!participant) {
        return res.status(403).json({ message: 'You are not a participant in this conversation' });
      }
      
      // Get all participants
      const participants = await storage.getParticipantsByConversationId(conversationId);
      
      // Get messages
      const messages = await storage.getMessagesByConversationId(conversationId);
      
      // Mark all unread messages as read
      for (const message of messages) {
        if (message.userId !== user.id) {
          await storage.updateMessageStatus(message.id, user.id, true);
        }
      }
      
      res.json({
        ...conversation,
        participants,
        messages
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Direct one-to-one conversation endpoint
  app.post('/api/conversations/direct/:userId', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const otherUserId = parseInt(req.params.userId);
      
      // Check if other user exists
      const otherUser = await storage.getUser(otherUserId);
      
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Find or create one-to-one conversation
      const conversation = await storage.findOrCreateOneToOneConversation(user.id, otherUserId);
      
      // Get participants
      const participants = await storage.getParticipantsByConversationId(conversation.id);
      
      // Get messages
      const messages = await storage.getMessagesByConversationId(conversation.id);
      
      res.json({
        ...conversation,
        participants,
        messages
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Message endpoints
  app.post('/api/messages', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const messageData = insertMessageSchema.parse(req.body);
      
      // Check if user is a participant in the conversation
      const participant = await storage.getParticipant(user.id, messageData.conversationId);
      
      if (!participant) {
        return res.status(403).json({ message: 'You are not a participant in this conversation' });
      }
      
      // Create message
      const message = await storage.createMessage({
        ...messageData,
        userId: user.id
      });
      
      // Get all participants of this conversation
      const participants = await storage.getParticipantsByConversationId(messageData.conversationId);
      
      // Create message status entries for all participants
      for (const p of participants) {
        await storage.createMessageStatus({
          messageId: message.id,
          userId: p.userId,
          isRead: p.userId === user.id // Message is read by sender
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/messages/:conversationId', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const conversationId = parseInt(req.params.conversationId);
      
      // Check if user is a participant in the conversation
      const participant = await storage.getParticipant(user.id, conversationId);
      
      if (!participant) {
        return res.status(403).json({ message: 'You are not a participant in this conversation' });
      }
      
      // Get messages
      const messages = await storage.getMessagesByConversationId(conversationId);
      
      // Mark all unread messages as read
      for (const message of messages) {
        if (message.userId !== user.id) {
          await storage.updateMessageStatus(message.id, user.id, true);
        }
      }
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Search users endpoint
  app.get('/api/users/search', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
      }
      
      // Search users by username or display name
      let results = [];
      
      if (process.env.MONGODB_URI) {
        // If using MongoDB
        const { UserModel } = require('./models/User');
        const users = await UserModel.find({
          $and: [
            { _id: { $ne: user.id } }, // Exclude current user
            {
              $or: [
                { username: { $regex: query, $options: 'i' } },
                { displayName: { $regex: query, $options: 'i' } }
              ]
            }
          ]
        }).select('-password');
        
        results = users.map(u => u.toJSON());
      } else {
        // If using in-memory storage as fallback
        const allUsers = Array.from(Object.values((storage as any).usersMap.values()));
        results = allUsers.filter(u => 
          u.id !== user.id && // Exclude current user
          (
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.displayName.toLowerCase().includes(query.toLowerCase())
          )
        ).map(({ password, ...userWithoutPassword }) => userWithoutPassword);
      }
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  return httpServer;
}
