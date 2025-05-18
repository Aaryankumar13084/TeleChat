import {
  User, InsertUser,
  Conversation, InsertConversation,
  Participant, InsertParticipant,
  Message, InsertMessage,
  MessageStatus, InsertMessageStatus
} from '@shared/schema';
import { log } from './vite';
import { UserModel, IUser } from './models/User';
import { ConversationModel, IConversation } from './models/Conversation';
import { ParticipantModel, IParticipant } from './models/Participant';
import { MessageModel, IMessage } from './models/Message';
import { MessageStatusModel, IMessageStatus } from './models/MessageStatus';
import { IStorage } from './storage';

export class MongodbStorage implements IStorage {
  constructor() {
    log('MongoDB storage initialized', 'database');
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await UserModel.findById(id);
      return user ? user.toJSON() as unknown as User : undefined;
    } catch (error) {
      log(`Error getting user: ${error}`, 'database');
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      return user ? user.toJSON() as unknown as User : undefined;
    } catch (error) {
      log(`Error getting user by username: ${error}`, 'database');
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
      return user ? user.toJSON() as unknown as User : undefined;
    } catch (error) {
      log(`Error getting user by email: ${error}`, 'database');
      return undefined;
    }
  }
  
  async createUser(user: InsertUser): Promise<User> {
    try {
      const newUser = new UserModel({
        ...user,
        isOnline: false,
        lastSeen: new Date()
      });
      
      await newUser.save();
      return newUser.toJSON() as unknown as User;
    } catch (error) {
      log(`Error creating user: ${error}`, 'database');
      throw error;
    }
  }
  
  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    try {
      const userId = typeof id === 'string' ? id : String(id);
      const user = await UserModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      );
      
      return user ? user.toJSON() as unknown as User : undefined;
    } catch (error) {
      log(`Error updating user: ${error}`, 'database');
      return undefined;
    }
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    try {
      const conversation = await ConversationModel.findById(id);
      return conversation ? conversation.toJSON() as unknown as Conversation : undefined;
    } catch (error) {
      log(`Error getting conversation: ${error}`, 'database');
      return undefined;
    }
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    try {
      // First get all participants for this user
      const participants = await ParticipantModel.find({ userId });
      const conversationIds = participants.map(p => p.conversationId);
      
      // Then get all conversations
      const conversations = await ConversationModel.find({
        _id: { $in: conversationIds }
      });
      
      return conversations.map(c => c.toJSON() as unknown as Conversation);
    } catch (error) {
      log(`Error getting conversations by user id: ${error}`, 'database');
      return [];
    }
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    try {
      const now = new Date();
      const conversation = new ConversationModel({
        ...insertConversation,
        createdAt: now,
        updatedAt: now,
        lastMessageId: null
      });
      
      await conversation.save();
      return conversation.toJSON() as unknown as Conversation;
    } catch (error) {
      log(`Error creating conversation: ${error}`, 'database');
      throw error;
    }
  }
  
  async updateConversation(id: number, updateData: Partial<Conversation>): Promise<Conversation | undefined> {
    try {
      const conversationId = typeof id === 'string' ? id : String(id);
      const conversation = await ConversationModel.findByIdAndUpdate(
        conversationId,
        {
          ...updateData,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      return conversation ? conversation.toJSON() as unknown as Conversation : undefined;
    } catch (error) {
      log(`Error updating conversation: ${error}`, 'database');
      return undefined;
    }
  }
  
  // Participant methods
  async getParticipantsByConversationId(conversationId: number): Promise<Participant[]> {
    try {
      const participants = await ParticipantModel.find({ conversationId });
      return participants.map(p => p.toJSON() as unknown as Participant);
    } catch (error) {
      log(`Error getting participants by conversation id: ${error}`, 'database');
      return [];
    }
  }
  
  async getParticipant(userId: number, conversationId: number): Promise<Participant | undefined> {
    try {
      const participant = await ParticipantModel.findOne({ userId, conversationId });
      return participant ? participant.toJSON() as unknown as Participant : undefined;
    } catch (error) {
      log(`Error getting participant: ${error}`, 'database');
      return undefined;
    }
  }
  
  async addParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    try {
      const participant = new ParticipantModel({
        ...insertParticipant,
        joinedAt: new Date()
      });
      
      await participant.save();
      return participant.toJSON() as unknown as Participant;
    } catch (error) {
      log(`Error adding participant: ${error}`, 'database');
      throw error;
    }
  }
  
  async removeParticipant(userId: number, conversationId: number): Promise<boolean> {
    try {
      const result = await ParticipantModel.deleteOne({
        userId,
        conversationId
      });
      
      return result.deletedCount > 0;
    } catch (error) {
      log(`Error removing participant: ${error}`, 'database');
      return false;
    }
  }
  
  // Message methods
  async getMessage(id: number | string): Promise<Message | undefined> {
    try {
      const message = await MessageModel.findById(id);
      return message ? message.toJSON() as unknown as Message : undefined;
    } catch (error) {
      log(`Error getting message: ${error}`, 'database');
      return undefined;
    }
  }
  
  async getMessagesByConversationId(conversationId: number | string): Promise<Message[]> {
    try {
      console.log(`MongoDB Storage: Getting messages for conversation ID: ${conversationId}`);
      
      // Handle both number and string IDs
      const messages = await MessageModel.find({ conversationId })
        .sort({ sentAt: 1 });
      
      console.log(`MongoDB Storage: Found ${messages.length} messages`);
      
      return messages.map(m => m.toJSON() as unknown as Message);
    } catch (error) {
      log(`Error getting messages by conversation id: ${error}`, 'database');
      console.error('Failed to get messages:', error);
      return [];
    }
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const now = new Date();
      const message = new MessageModel({
        ...insertMessage,
        sentAt: now,
        deliveredAt: now,
        status: 'delivered'
      });
      
      await message.save();
      
      // Update the conversation's lastMessageId
      await ConversationModel.findByIdAndUpdate(
        insertMessage.conversationId,
        {
          lastMessageId: message._id,
          updatedAt: now
        }
      );
      
      return message.toJSON() as unknown as Message;
    } catch (error) {
      log(`Error creating message: ${error}`, 'database');
      throw error;
    }
  }
  
  async updateMessage(id: number | string, updateData: Partial<Message>): Promise<Message | undefined> {
    try {
      const messageId = typeof id === 'string' ? id : String(id);
      const result = await MessageModel.findByIdAndUpdate(
        messageId,
        updateData,
        { new: true }
      ).lean();
      
      if (!result) return undefined;
      
      return this.mongoToMessage(result);
    } catch (error) {
      log(`Error updating message: ${error}`, 'database');
      return undefined;
    }
  }
  
  // Adding the deleteMessage method that was missing
  async deleteMessage(id: number | string): Promise<boolean> {
    try {
      log(`MongoDB: Attempting to delete message with ID: ${id}`, 'database');
      const messageId = typeof id === 'string' ? id : String(id);
      const result = await MessageModel.findByIdAndDelete(messageId);
      const success = !!result;
      
      if (success) {
        log(`MongoDB: Successfully deleted message ${messageId}`, 'database');
      } else {
        log(`MongoDB: Message not found for deletion ${messageId}`, 'database');
      }
      
      return success;
    } catch (error) {
      log(`Error deleting message: ${error}`, 'database');
      return false;
    }
  }
  
  // Message status methods
  async getMessageStatus(messageId: number, userId: number): Promise<MessageStatus | undefined> {
    try {
      const status = await MessageStatusModel.findOne({
        messageId,
        userId
      });
      
      return status ? status.toJSON() as unknown as MessageStatus : undefined;
    } catch (error) {
      log(`Error getting message status: ${error}`, 'database');
      return undefined;
    }
  }
  
  async createMessageStatus(insertStatus: InsertMessageStatus): Promise<MessageStatus> {
    try {
      const status = new MessageStatusModel({
        ...insertStatus,
        readAt: insertStatus.isRead ? new Date() : null
      });
      
      await status.save();
      return status.toJSON() as unknown as MessageStatus;
    } catch (error) {
      log(`Error creating message status: ${error}`, 'database');
      throw error;
    }
  }
  
  async updateMessageStatus(messageId: number, userId: number, isRead: boolean): Promise<MessageStatus | undefined> {
    try {
      const now = new Date();
      const status = await MessageStatusModel.findOneAndUpdate(
        { messageId, userId },
        {
          isRead,
          readAt: isRead ? now : null
        },
        { new: true }
      );
      
      return status ? status.toJSON() as unknown as MessageStatus : undefined;
    } catch (error) {
      log(`Error updating message status: ${error}`, 'database');
      return undefined;
    }
  }
  
  // Composite methods
  async findOrCreateOneToOneConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    try {
      console.log(`Creating direct conversation between ${user1Id} and ${user2Id}`);
      
      // Get user 2 to check if exists
      const user = await this.getUser(user2Id);
      
      if (!user) {
        throw new Error(`User ${user2Id} not found`);
      }
      
      console.log(`Found user: ${user.username}`);
      
      // First, check if a conversation between these two users already exists
      const user1Conversations = await this.getConversationsByUserId(user1Id);
      
      for (const conversation of user1Conversations) {
        // Skip group conversations
        if (conversation.isGroup) continue;
        
        // Get participants of this conversation
        const participants = await this.getParticipantsByConversationId(conversation.id);
        
        // If there are exactly 2 participants and the other user is user2, we found it
        if (participants.length === 2 && participants.some(p => String(p.userId) === String(user2Id))) {
          console.log(`Found existing conversation: ${conversation.id}`);
          return conversation;
        }
      }
      
      // If we get here, we need to create a new conversation
      console.log(`Creating new conversation between ${user1Id} and ${user2Id}`);
      
      // Create a new conversation
      const newConversation = await this.createConversation({
        name: null,
        avatarUrl: null,
        isGroup: false
      });
      
      // Add both users as participants
      await this.addParticipant({
        conversationId: newConversation.id,
        userId: user1Id,
        isAdmin: true
      });
      
      await this.addParticipant({
        conversationId: newConversation.id,
        userId: user2Id,
        isAdmin: false
      });
      
      return newConversation;
    } catch (error) {
      log(`Error finding or creating one-to-one conversation: ${error}`, 'database');
      throw error;
    }
  }
  
  async getConversationsWithParticipantsAndLastMessage(userId: number): Promise<any[]> {
    try {
      // Get all conversations for user
      const conversations = await this.getConversationsByUserId(userId);
      
      return await Promise.all(conversations.map(async (conversation) => {
        // Get all participants with user data
        const participants = await this.getParticipantsByConversationId(conversation.id);
        const participantsWithData = await Promise.all(
          participants.map(async (p) => {
            const user = await this.getUser(p.userId);
            return { ...p, user };
          })
        );
        
        // Get last message
        let lastMessage = null;
        if (conversation.lastMessageId) {
          lastMessage = await this.getMessage(conversation.lastMessageId);
        }
        
        // For one-to-one conversations, get the other user's info
        let otherUser = null;
        if (!conversation.isGroup) {
          const otherParticipant = participantsWithData.find(p => p.userId !== userId);
          if (otherParticipant) {
            otherUser = otherParticipant.user;
          }
        }
        
        return {
          ...conversation,
          participants: participantsWithData,
          lastMessage,
          otherUser
        };
      }));
    } catch (error) {
      log(`Error getting conversations with participants and last message: ${error}`, 'database');
      return [];
    }
  }
  
  // Helper method to convert MongoDB document ID to string
  private getObjectId(id: number | string): string {
    return typeof id === 'string' ? id : String(id);
  }
  
  // Helper method to convert MongoDB user document to User type
  private mongoToUser(mongoUser: any): User {
    const { _id, __v, ...rest } = mongoUser;
    return {
      ...rest,
      id: _id.toString()
    };
  }
  
  // Helper method to convert MongoDB conversation document to Conversation type
  private mongoToConversation(mongoConversation: any): Conversation {
    const { _id, __v, ...rest } = mongoConversation;
    return {
      ...rest,
      id: _id.toString()
    };
  }
  
  // Helper method to convert MongoDB message document to Message type
  private mongoToMessage(mongoMessage: any): Message {
    const { _id, __v, ...rest } = mongoMessage;
    return {
      ...rest,
      id: _id.toString()
    };
  }
}