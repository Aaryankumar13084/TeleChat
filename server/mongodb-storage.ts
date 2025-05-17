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
      const user = await UserModel.findByIdAndUpdate(
        id,
        { ...updateData },
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
      // Find all conversation IDs where the user is a participant
      const participations = await ParticipantModel.find({ userId });
      const conversationIds = participations.map(p => p.conversationId);
      
      // Get all those conversations
      const conversations = await ConversationModel.find({
        _id: { $in: conversationIds }
      });
      
      return conversations.map(conv => conv.toJSON() as unknown as Conversation);
    } catch (error) {
      log(`Error getting conversations by user id: ${error}`, 'database');
      return [];
    }
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    try {
      const now = new Date();
      const newConversation = new ConversationModel({
        ...conversation,
        createdAt: now,
        updatedAt: now,
        lastMessageId: null
      });
      
      await newConversation.save();
      return newConversation.toJSON() as unknown as Conversation;
    } catch (error) {
      log(`Error creating conversation: ${error}`, 'database');
      throw error;
    }
  }
  
  async updateConversation(id: number, updateData: Partial<Conversation>): Promise<Conversation | undefined> {
    try {
      const conversation = await ConversationModel.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
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
      const participant = await ParticipantModel.findOne({
        userId,
        conversationId
      });
      
      return participant ? participant.toJSON() as unknown as Participant : undefined;
    } catch (error) {
      log(`Error getting participant: ${error}`, 'database');
      return undefined;
    }
  }
  
  async addParticipant(participant: InsertParticipant): Promise<Participant> {
    try {
      const newParticipant = new ParticipantModel({
        ...participant,
        joinedAt: new Date()
      });
      
      await newParticipant.save();
      return newParticipant.toJSON() as unknown as Participant;
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
  async getMessage(id: number): Promise<Message | undefined> {
    try {
      const message = await MessageModel.findById(id);
      return message ? message.toJSON() as unknown as Message : undefined;
    } catch (error) {
      log(`Error getting message: ${error}`, 'database');
      return undefined;
    }
  }
  
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    try {
      const messages = await MessageModel.find({ conversationId })
        .sort({ sentAt: 1 });
      
      return messages.map(m => m.toJSON() as unknown as Message);
    } catch (error) {
      log(`Error getting messages by conversation id: ${error}`, 'database');
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
      if (insertMessage.conversationId) {
        await ConversationModel.findByIdAndUpdate(
          insertMessage.conversationId,
          {
            lastMessageId: message._id,
            updatedAt: now
          }
        );
      }
      
      return message.toJSON() as unknown as Message;
    } catch (error) {
      log(`Error creating message: ${error}`, 'database');
      throw error;
    }
  }
  
  async updateMessage(id: number, updateData: Partial<Message>): Promise<Message | undefined> {
    try {
      const message = await MessageModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      return message ? message.toJSON() as unknown as Message : undefined;
    } catch (error) {
      log(`Error updating message: ${error}`, 'database');
      return undefined;
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
      // Get all one-to-one conversations for user1
      const user1Conversations = await this.getConversationsByUserId(user1Id);
      const oneToOneConversations = user1Conversations.filter(c => !c.isGroup);
      
      // For each conversation, check if user2 is a participant
      for (const conversation of oneToOneConversations) {
        const participants = await this.getParticipantsByConversationId(conversation.id);
        if (participants.some(p => p.userId === user2Id)) {
          return conversation;
        }
      }
      
      // If no existing conversation is found, create a new one
      const newConversation = await this.createConversation({
        name: null,
        isGroup: false,
        avatarUrl: null
      });
      
      // Add both users as participants
      await this.addParticipant({
        userId: user1Id,
        conversationId: newConversation.id,
        isAdmin: false
      });
      
      await this.addParticipant({
        userId: user2Id,
        conversationId: newConversation.id,
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
      throw error;
    }
  }
}