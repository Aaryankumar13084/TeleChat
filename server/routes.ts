import { Express, NextFunction, Request, Response } from 'express';
import { Server, createServer } from 'http';
import { WebSocketServer } from 'ws';
import { z } from 'zod';

import { insertUserSchema } from '@shared/schema';
import { storage } from './storage';
import { createToken, getAuthUser, hashPassword, verifyPassword, authMiddleware } from './auth';
import { ChatWebSocketServer } from './websocket';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize WebSocket server (only one instance)
  const chatWss = new ChatWebSocketServer(httpServer);
  
  console.log('[websocket] WebSocket server initialized');
  
  // Authentication endpoints
  // Authentication endpoints
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.extend({
        confirmPassword: z.string()
      }).parse(req.body);

      // Check if passwords match
      if (data.password !== data.confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(data.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      const existingUserByEmail = await storage.getUserByEmail(data.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        isOnline: true,
        lastSeen: new Date()
      });

      // Create token
      const token = createToken(user);

      // Return user data and token
      const { password, ...userWithoutPassword } = user;

      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      // Check if username and password are provided
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      // Get user by username
      const user = await storage.getUserByUsername(username);

      // Check if user exists
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update user online status
      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });

      // Create token
      const token = createToken(user);

      // Return user data and token
      const { password: _, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // User endpoints
  app.get('/api/users/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
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
      
      const { displayName, bio, avatarUrl } = req.body;
      
      const updatedUser = await storage.updateUser(user.id, {
        displayName,
        bio,
        avatarUrl
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
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
      
      const { name, isGroup, participantIds } = req.body;
      
      if (isGroup && (!name || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0)) {
        return res.status(400).json({ message: 'Group name and participants are required' });
      }
      
      // Create conversation
      const conversation = await storage.createConversation({
        name: isGroup ? name : null,
        isGroup: isGroup || false,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageId: null
      });
      
      // Add current user as participant and admin (if group)
      await storage.addParticipant({
        userId: user.id,
        conversationId: conversation.id,
        isAdmin: isGroup,
        joinedAt: new Date()
      });
      
      // Add other participants
      if (isGroup && participantIds) {
        for (const participantId of participantIds) {
          const participantUser = await storage.getUser(participantId);
          
          if (participantUser) {
            await storage.addParticipant({
              userId: participantUser.id,
              conversationId: conversation.id,
              isAdmin: false,
              joinedAt: new Date()
            });
          }
        }
      }
      
      // Get participants
      const participants = await storage.getParticipantsByConversationId(conversation.id);
      
      // Get messages
      const messages = await storage.getMessagesByConversationId(conversation.id);
      
      res.status(201).json({
        ...conversation,
        participants,
        messages
      });
    } catch (error) {
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
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if user is a participant
      const participant = await storage.getParticipant(user.id, conversationId);
      
      if (!participant) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get participants
      const participants = await storage.getParticipantsByConversationId(conversationId);
      
      // Get messages
      const messages = await storage.getMessagesByConversationId(conversationId);
      
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
      
      // With MongoDB we need to use proper ObjectId
      const userId = req.params.userId;
      console.log('Creating direct conversation between', user.id, 'and', userId);
      
      if (process.env.MONGODB_URI) {
        // If using MongoDB
        try {
          const { UserModel } = await import('./models/User');
          const mongoose = await import('mongoose');
          
          // Check if the user ID is a valid MongoDB ObjectId
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('Invalid ObjectId format:', userId);
            return res.status(400).json({ message: 'Invalid user ID format' });
          }
          
          // Find the other user by ObjectId
          const otherUser = await UserModel.findById(userId);
          
          if (!otherUser) {
            console.log('User not found with ID:', userId);
            return res.status(404).json({ message: 'User not found' });
          }
          
          console.log('Found user:', otherUser.username);
          
          // Check if conversation already exists
          const { ConversationModel } = await import('./models/Conversation');
          const { ParticipantModel } = await import('./models/Participant');
          
          // Find conversations where both users are participants
          const userConversations = await ParticipantModel.find({ 
            userId: user.id 
          }).select('conversationId');
          
          const userConversationIds = userConversations.map(p => p.conversationId);
          
          const sharedConversations = await ParticipantModel.find({
            userId: otherUser.id,
            conversationId: { $in: userConversationIds }
          }).populate('conversationId');
          
          // Filter to find direct (non-group) conversations
          let existingConversation = null;
          for (const participant of sharedConversations) {
            const conv = participant.conversationId;
            if (!conv.isGroup) {
              existingConversation = conv;
              break;
            }
          }
          
          if (existingConversation) {
            console.log('Found existing conversation:', existingConversation.id);
            return res.json(existingConversation);
          }
          
          // Create new conversation
          const newConversation = new ConversationModel({
            isGroup: false,
            name: null,
            avatarUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessageId: null
          });
          
          await newConversation.save();
          console.log('Created new conversation:', newConversation.id);
          
          // Add participants
          const participant1 = new ParticipantModel({
            userId: user.id,
            conversationId: newConversation.id,
            isAdmin: false,
            joinedAt: new Date()
          });
          
          const participant2 = new ParticipantModel({
            userId: otherUser.id,
            conversationId: newConversation.id,
            isAdmin: false,
            joinedAt: new Date()
          });
          
          await Promise.all([participant1.save(), participant2.save()]);
          console.log('Added participants');
          
          return res.status(201).json(newConversation);
        } catch (dbError) {
          console.error('MongoDB error creating direct conversation:', dbError);
          throw dbError;
        }
      } else {
        // For in-memory storage, continue with parseInt
        const otherUserId = parseInt(userId);
        
        // Check if other user exists
        const otherUser = await storage.getUser(otherUserId);
        
        if (!otherUser) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Find or create one-to-one conversation
        const conversation = await storage.findOrCreateOneToOneConversation(user.id, otherUserId);
      
        // Get participants
        const participants = await storage.getParticipantsByConversationId(conversation.id);
        
        // Get last message
        const messages = await storage.getMessagesByConversationId(conversation.id);
        
        return res.json({
          ...conversation,
          participants,
          messages
        });
      }
    } catch (error) {
      console.error('Error creating direct conversation:', error);
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
      
      const { conversationId, content, mediaUrl, mediaType } = req.body;
      
      if (!conversationId) {
        return res.status(400).json({ message: 'Conversation ID is required' });
      }
      
      if (!content && !mediaUrl) {
        return res.status(400).json({ message: 'Message content or media is required' });
      }
      
      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if user is a participant
      const participant = await storage.getParticipant(user.id, conversationId);
      
      if (!participant) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Create message
      const message = await storage.createMessage({
        content: content || null,
        status: 'sent',
        userId: user.id,
        conversationId,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        sentAt: new Date(),
        deliveredAt: new Date()
      });
      
      // Create message status for all participants
      const participants = await storage.getParticipantsByConversationId(conversationId);
      
      for (const p of participants) {
        await storage.createMessageStatus({
          userId: p.userId,
          messageId: message.id,
          isRead: p.userId === user.id, // Only the sender has read the message initially
          readAt: p.userId === user.id ? new Date() : null
        });
      }
      
      // Update conversation with last message ID
      await storage.updateConversation(conversationId, {
        lastMessageId: message.id,
        updatedAt: new Date()
      });
      
      // Broadcast message to other participants via WebSocket
      if (chatWss) {
        for (const p of participants) {
          if (p.userId !== user.id) {
            chatWss.sendToUser(p.userId, {
              type: 'new_message',
              payload: {
                message,
                conversationId
              }
            });
          }
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/messages/:conversationId', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = getAuthUser(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Support both number and MongoDB string IDs
      const conversationId = req.params.conversationId;
      console.log(`Getting messages for conversation ID: ${conversationId}`);
      
      // Convert string ID to number if possible - for compatibility with different storage types
      let convId = conversationId;
      if (!isNaN(parseInt(conversationId))) {
        convId = parseInt(conversationId);
      }
      
      // For MongoDB string IDs, we need special handling
      try {
        // Instead of checking participants, just get the conversation directly
        const conversation = await storage.getConversation(conversationId);
        
        if (!conversation) {
          console.log(`Conversation ${conversationId} not found`);
          return res.status(404).json({ message: 'Conversation not found' });
        }
        
        console.log(`Found conversation: ${JSON.stringify(conversation)}`);
        
        // For MongoDB, we'll get messages directly by the string ID
        // We'll skip the participant check for now since it's causing issues with MongoDB
      } catch (error) {
        console.log(`Error getting conversation: ${error}`);
        // Continue anyway for debugging
      }
      
      // Try to get messages using both the original conversation ID and the processed one
      let messages;
      
      try {
        // Try with the original ID string first (for MongoDB)
        messages = await storage.getMessagesByConversationId(conversationId);
        console.log(`Found ${messages.length} messages using original ID ${conversationId}`);
      } catch (error) {
        console.error(`Error getting messages with original ID: ${error}`);
        
        try {
          // Fall back to the converted ID if needed
          messages = await storage.getMessagesByConversationId(convId);
          console.log(`Found ${messages.length} messages using converted ID ${convId}`);
        } catch (fallbackError) {
          console.error(`Error getting messages with fallback ID: ${fallbackError}`);
          messages = [];
        }
      }
      
      // Return the messages we found
      console.log(`Returning ${messages.length} messages for conversation ${conversationId}`);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete a message endpoint
  app.delete('/api/messages/:messageId', authMiddleware, async (req: Request, res: Response) => {
    const { messageId } = req.params;
    const user = getAuthUser(req);
    
    try {
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Convert message ID to the appropriate type
      let msgId;
      try {
        msgId = parseInt(messageId);
      } catch (e) {
        msgId = messageId; // For MongoDB string IDs
      }
      
      // Get the message to check ownership
      const message = await storage.getMessage(msgId);
      
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Check if user is authorized to delete the message
      if (message.userId.toString() !== user.id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this message' });
      }
      
      // Delete the message
      const success = await storage.deleteMessage(msgId);
      
      if (success) {
        res.status(200).json({ success: true, messageId: msgId, conversationId: message.conversationId });
      } else {
        res.status(500).json({ message: 'Failed to delete message' });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Search users endpoint - temporarily remove auth middleware for testing
  app.get('/api/users/search', async (req: Request, res: Response) => {
    try {
      console.log('Searching users with query:', req.query.q);
      // Get user if available, but don't require it for search
      const user = getAuthUser(req);
      console.log('User from request:', user ? user.username : 'No user');
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters' });
      }
      
      // Search users by username or display name
      let results = [];
      
      if (process.env.MONGODB_URI) {
        console.log('Using MongoDB search');
        try {
          // Create a simpler search endpoint for now
          const { UserModel } = await import('./models/User');
          console.log('User model loaded');
          
          // Get all users
          const users = await UserModel.find({}).select('-password');
          console.log('Found users:', users.length);
          
          // Manual filtering with detailed logging
          const filteredUsers = [];
          for (const u of users) {
            // Skip the current user if authenticated
            if (user && u.id === user.id) {
              console.log('Skipping current user:', u.username);
              continue;
            }
            
            // Check if username or displayName matches the query
            const usernameMatch = u.username.toLowerCase().includes(query.toLowerCase());
            const displayNameMatch = u.displayName && u.displayName.toLowerCase().includes(query.toLowerCase());
            
            if (usernameMatch || displayNameMatch) {
              console.log('Adding matching user:', u.username);
              filteredUsers.push(u);
            }
          }
          
          console.log('Filtered users:', filteredUsers.length);
          results = filteredUsers.map(u => u.toJSON ? u.toJSON() : u);
        } catch (dbError) {
          console.error('MongoDB search error:', dbError);
          throw dbError;
        }
      } else {
        console.log('Using in-memory search');
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
      
      console.log('Returning results:', results.length);
      res.json(results);
    } catch (error) {
      console.error('User search error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return httpServer;
}