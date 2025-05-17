import {
  users, conversations, participants, messages, messageStatus,
  type User, type InsertUser,
  type Conversation, type InsertConversation,
  type Participant, type InsertParticipant,
  type Message, type InsertMessage,
  type MessageStatus, type InsertMessageStatus
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<Conversation>): Promise<Conversation | undefined>;
  
  // Participant methods
  getParticipantsByConversationId(conversationId: number): Promise<Participant[]>;
  getParticipant(userId: number, conversationId: number): Promise<Participant | undefined>;
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  removeParticipant(userId: number, conversationId: number): Promise<boolean>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<Message>): Promise<Message | undefined>;
  
  // Message status methods
  getMessageStatus(messageId: number, userId: number): Promise<MessageStatus | undefined>;
  createMessageStatus(status: InsertMessageStatus): Promise<MessageStatus>;
  updateMessageStatus(messageId: number, userId: number, isRead: boolean): Promise<MessageStatus | undefined>;
  
  // Composite methods
  findOrCreateOneToOneConversation(user1Id: number, user2Id: number): Promise<Conversation>;
  getConversationsWithParticipantsAndLastMessage(userId: number): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private conversationsMap: Map<number, Conversation>;
  private participantsMap: Map<number, Participant>;
  private messagesMap: Map<number, Message>;
  private messageStatusMap: Map<number, MessageStatus>;
  
  private userId: number;
  private conversationId: number;
  private participantId: number;
  private messageId: number;
  private messageStatusId: number;
  
  constructor() {
    this.usersMap = new Map();
    this.conversationsMap = new Map();
    this.participantsMap = new Map();
    this.messagesMap = new Map();
    this.messageStatusMap = new Map();
    
    this.userId = 1;
    this.conversationId = 1;
    this.participantId = 1;
    this.messageId = 1;
    this.messageStatusId = 1;
    
    // Add some demo data
    this.seedDemoData();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      isOnline: false,
      lastSeen: now
    };
    this.usersMap.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    const user = this.usersMap.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updateData };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversationsMap.get(id);
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    const participantEntries = Array.from(this.participantsMap.values())
      .filter(p => p.userId === userId);
    
    return participantEntries.map(p => 
      this.conversationsMap.get(p.conversationId)!
    ).filter(Boolean);
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationId++;
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
      lastMessageId: null
    };
    this.conversationsMap.set(id, conversation);
    return conversation;
  }
  
  async updateConversation(id: number, updateData: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversationsMap.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = { ...conversation, ...updateData, updatedAt: new Date() };
    this.conversationsMap.set(id, updatedConversation);
    return updatedConversation;
  }
  
  // Participant methods
  async getParticipantsByConversationId(conversationId: number): Promise<Participant[]> {
    return Array.from(this.participantsMap.values())
      .filter(p => p.conversationId === conversationId);
  }
  
  async getParticipant(userId: number, conversationId: number): Promise<Participant | undefined> {
    return Array.from(this.participantsMap.values())
      .find(p => p.userId === userId && p.conversationId === conversationId);
  }
  
  async addParticipant(insertParticipant: InsertParticipant): Promise<Participant> {
    const id = this.participantId++;
    const now = new Date();
    const participant: Participant = {
      ...insertParticipant,
      id,
      joinedAt: now
    };
    this.participantsMap.set(id, participant);
    return participant;
  }
  
  async removeParticipant(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.getParticipant(userId, conversationId);
    if (!participant) return false;
    
    this.participantsMap.delete(participant.id);
    return true;
  }
  
  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messagesMap.get(id);
  }
  
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messagesMap.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const now = new Date();
    const message: Message = {
      ...insertMessage,
      id,
      sentAt: now,
      deliveredAt: now,
      status: 'delivered'
    };
    this.messagesMap.set(id, message);
    
    // Update the conversation's lastMessageId
    const conversation = this.conversationsMap.get(message.conversationId);
    if (conversation) {
      this.updateConversation(conversation.id, { 
        lastMessageId: id,
        updatedAt: now
      });
    }
    
    return message;
  }
  
  async updateMessage(id: number, updateData: Partial<Message>): Promise<Message | undefined> {
    const message = this.messagesMap.get(id);
    if (!message) return undefined;
    
    const updatedMessage = { ...message, ...updateData };
    this.messagesMap.set(id, updatedMessage);
    return updatedMessage;
  }
  
  // Message status methods
  async getMessageStatus(messageId: number, userId: number): Promise<MessageStatus | undefined> {
    return Array.from(this.messageStatusMap.values())
      .find(s => s.messageId === messageId && s.userId === userId);
  }
  
  async createMessageStatus(insertStatus: InsertMessageStatus): Promise<MessageStatus> {
    const id = this.messageStatusId++;
    const status: MessageStatus = {
      ...insertStatus,
      id,
      readAt: insertStatus.isRead ? new Date() : null
    };
    this.messageStatusMap.set(id, status);
    return status;
  }
  
  async updateMessageStatus(messageId: number, userId: number, isRead: boolean): Promise<MessageStatus | undefined> {
    const status = await this.getMessageStatus(messageId, userId);
    if (!status) return undefined;
    
    const updatedStatus: MessageStatus = {
      ...status,
      isRead,
      readAt: isRead ? new Date() : null
    };
    this.messageStatusMap.set(status.id, updatedStatus);
    return updatedStatus;
  }
  
  // Composite methods
  async findOrCreateOneToOneConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    // Get all conversations for user1
    const user1Conversations = await this.getConversationsByUserId(user1Id);
    
    // Filter for non-group conversations
    const oneToOneConversations = user1Conversations.filter(c => !c.isGroup);
    
    // For each one-to-one conversation, check if user2 is a participant
    for (const conversation of oneToOneConversations) {
      const participants = await this.getParticipantsByConversationId(conversation.id);
      if (participants.some(p => p.userId === user2Id)) {
        return conversation;
      }
    }
    
    // If no existing conversation is found, create a new one
    const newConversation = await this.createConversation({
      name: null, // No name for one-to-one conversations
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
  }
  
  async getConversationsWithParticipantsAndLastMessage(userId: number): Promise<any[]> {
    const conversations = await this.getConversationsByUserId(userId);
    
    return await Promise.all(conversations.map(async (conversation) => {
      const participants = await this.getParticipantsByConversationId(conversation.id);
      const participantsWithData = await Promise.all(
        participants.map(async (p) => {
          const user = await this.getUser(p.userId);
          return { ...p, user };
        })
      );
      
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
  }
  
  private seedDemoData() {
    // This method will pre-populate some demo data
    // This will be removed in a production app, but helps for demonstration
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Demo users
    const user1: User = {
      id: this.userId++,
      username: 'rahul',
      password: '$2a$10$XtMzGRxX2zdJu.jvB55TUeVXZHGcXVGxBMZVjDvttm5k/5JG7L2eO', // 'password'
      displayName: 'Rahul Kumar',
      email: 'rahul@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100',
      bio: 'Software Engineer',
      isOnline: true,
      lastSeen: now
    };
    
    const user2: User = {
      id: this.userId++,
      username: 'priya',
      password: '$2a$10$XtMzGRxX2zdJu.jvB55TUeVXZHGcXVGxBMZVjDvttm5k/5JG7L2eO', // 'password'
      displayName: 'Priya Sharma',
      email: 'priya@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100',
      bio: 'Product Manager',
      isOnline: true,
      lastSeen: now
    };
    
    const user3: User = {
      id: this.userId++,
      username: 'vikram',
      password: '$2a$10$XtMzGRxX2zdJu.jvB55TUeVXZHGcXVGxBMZVjDvttm5k/5JG7L2eO', // 'password'
      displayName: 'Vikram Patel',
      email: 'vikram@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100',
      bio: 'UX Designer',
      isOnline: false,
      lastSeen: yesterday
    };
    
    this.usersMap.set(user1.id, user1);
    this.usersMap.set(user2.id, user2);
    this.usersMap.set(user3.id, user3);
    
    // Conversations
    const conv1: Conversation = {
      id: this.conversationId++,
      name: null, // One-to-one doesn't need a name
      isGroup: false,
      createdAt: yesterday,
      updatedAt: now,
      avatarUrl: null,
      lastMessageId: null // Will set this after creating messages
    };
    
    const conv2: Conversation = {
      id: this.conversationId++,
      name: 'Team Project',
      isGroup: true,
      createdAt: yesterday,
      updatedAt: yesterday,
      avatarUrl: 'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100',
      lastMessageId: null
    };
    
    this.conversationsMap.set(conv1.id, conv1);
    this.conversationsMap.set(conv2.id, conv2);
    
    // Participants
    const part1: Participant = {
      id: this.participantId++,
      userId: user1.id,
      conversationId: conv1.id,
      isAdmin: false,
      joinedAt: yesterday
    };
    
    const part2: Participant = {
      id: this.participantId++,
      userId: user2.id,
      conversationId: conv1.id,
      isAdmin: false,
      joinedAt: yesterday
    };
    
    const part3: Participant = {
      id: this.participantId++,
      userId: user1.id,
      conversationId: conv2.id,
      isAdmin: true,
      joinedAt: yesterday
    };
    
    const part4: Participant = {
      id: this.participantId++,
      userId: user2.id,
      conversationId: conv2.id,
      isAdmin: false,
      joinedAt: yesterday
    };
    
    const part5: Participant = {
      id: this.participantId++,
      userId: user3.id,
      conversationId: conv2.id,
      isAdmin: false,
      joinedAt: yesterday
    };
    
    this.participantsMap.set(part1.id, part1);
    this.participantsMap.set(part2.id, part2);
    this.participantsMap.set(part3.id, part3);
    this.participantsMap.set(part4.id, part4);
    this.participantsMap.set(part5.id, part5);
    
    // Some messages
    const twoHoursAgo = new Date(now);
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const oneHourAgo = new Date(now);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const tenMinutesAgo = new Date(now);
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    const fiveMinutesAgo = new Date(now);
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const msg1: Message = {
      id: this.messageId++,
      conversationId: conv1.id,
      userId: user2.id,
      content: "Hi Rahul! How's the project coming along?",
      mediaUrl: null,
      mediaType: null,
      sentAt: twoHoursAgo,
      deliveredAt: twoHoursAgo,
      status: 'seen'
    };
    
    const msg2: Message = {
      id: this.messageId++,
      conversationId: conv1.id,
      userId: user1.id,
      content: "Project is going well. Here's the latest design mockup we're working on:",
      mediaUrl: "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=600&h=400",
      mediaType: 'image',
      sentAt: oneHourAgo,
      deliveredAt: oneHourAgo,
      status: 'seen'
    };
    
    const msg3: Message = {
      id: this.messageId++,
      conversationId: conv1.id,
      userId: user2.id,
      content: "This looks great! I like the color scheme and layout.",
      mediaUrl: null,
      mediaType: null,
      sentAt: oneHourAgo,
      deliveredAt: oneHourAgo,
      status: 'seen'
    };
    
    const msg4: Message = {
      id: this.messageId++,
      conversationId: conv1.id,
      userId: user2.id,
      content: "Here are the meeting details for tomorrow:",
      mediaUrl: "https://example.com/meeting_agenda.pdf",
      mediaType: 'document',
      sentAt: tenMinutesAgo,
      deliveredAt: tenMinutesAgo,
      status: 'seen'
    };
    
    const msg5: Message = {
      id: this.messageId++,
      conversationId: conv1.id,
      userId: user1.id,
      content: "Thanks for sharing. I'll review it and come prepared for the meeting.",
      mediaUrl: null,
      mediaType: null,
      sentAt: fiveMinutesAgo,
      deliveredAt: fiveMinutesAgo,
      status: 'delivered'
    };
    
    const msg6: Message = {
      id: this.messageId++,
      conversationId: conv1.id,
      userId: user2.id,
      content: "Meeting ke details share kar dena please... Call bhi karna hai kya?",
      mediaUrl: null,
      mediaType: null,
      sentAt: now,
      deliveredAt: now,
      status: 'delivered'
    };
    
    this.messagesMap.set(msg1.id, msg1);
    this.messagesMap.set(msg2.id, msg2);
    this.messagesMap.set(msg3.id, msg3);
    this.messagesMap.set(msg4.id, msg4);
    this.messagesMap.set(msg5.id, msg5);
    this.messagesMap.set(msg6.id, msg6);
    
    // Update conversation with last message id
    conv1.lastMessageId = msg6.id;
    this.conversationsMap.set(conv1.id, conv1);
    
    // Add a message to the group chat
    const msgGroup: Message = {
      id: this.messageId++,
      conversationId: conv2.id,
      userId: user2.id,
      content: "Next sprint planning...",
      mediaUrl: null,
      mediaType: null,
      sentAt: yesterday,
      deliveredAt: yesterday,
      status: 'seen'
    };
    
    this.messagesMap.set(msgGroup.id, msgGroup);
    
    // Update group conversation with last message id
    conv2.lastMessageId = msgGroup.id;
    this.conversationsMap.set(conv2.id, conv2);
    
    // Message statuses
    const status1: MessageStatus = {
      id: this.messageStatusId++,
      messageId: msg1.id,
      userId: user1.id,
      isRead: true,
      readAt: twoHoursAgo
    };
    
    const status2: MessageStatus = {
      id: this.messageStatusId++,
      messageId: msg2.id,
      userId: user2.id,
      isRead: true,
      readAt: oneHourAgo
    };
    
    const status3: MessageStatus = {
      id: this.messageStatusId++,
      messageId: msg3.id,
      userId: user1.id,
      isRead: true,
      readAt: oneHourAgo
    };
    
    const status4: MessageStatus = {
      id: this.messageStatusId++,
      messageId: msg4.id,
      userId: user1.id,
      isRead: true,
      readAt: tenMinutesAgo
    };
    
    const status5: MessageStatus = {
      id: this.messageStatusId++,
      messageId: msg5.id,
      userId: user2.id,
      isRead: false,
      readAt: null
    };
    
    const status6: MessageStatus = {
      id: this.messageStatusId++,
      messageId: msg6.id,
      userId: user1.id,
      isRead: false,
      readAt: null
    };
    
    this.messageStatusMap.set(status1.id, status1);
    this.messageStatusMap.set(status2.id, status2);
    this.messageStatusMap.set(status3.id, status3);
    this.messageStatusMap.set(status4.id, status4);
    this.messageStatusMap.set(status5.id, status5);
    this.messageStatusMap.set(status6.id, status6);
  }
}

export const storage = new MemStorage();
