// MongoDB Types
import { Conversation, Message, MessageStatus, Participant, User } from '@shared/schema';

// MongoDB User extends the base User type but with string ID
export type MongoUser = Omit<User, 'id'> & { id: string };

// MongoDB Conversation extends the base Conversation type but with string ID
export type MongoConversation = Omit<Conversation, 'id'> & { id: string };

// MongoDB Message extends the base Message type but with string ID
export type MongoMessage = Omit<Message, 'id' | 'userId' | 'conversationId'> & { 
  id: string;
  userId: string;
  conversationId: string;
};

// MongoDB Participant extends the base Participant type but with string ID
export type MongoParticipant = Omit<Participant, 'id' | 'userId' | 'conversationId'> & { 
  id: string;
  userId: string;
  conversationId: string;
};

// MongoDB MessageStatus extends the base MessageStatus type but with string ID
export type MongoMessageStatus = Omit<MessageStatus, 'id' | 'userId' | 'messageId'> & { 
  id: string;
  userId: string;
  messageId: string;
};

// Union type for ID that can be either string (MongoDB) or number (In-memory)
export type EntityId = string | number;

// Helper functions to work with either type of ID
export const isSameId = (id1: EntityId, id2: EntityId): boolean => {
  return String(id1) === String(id2);
};

export const getIdAsString = (id: EntityId): string => {
  return String(id);
};

export const getIdAsNumber = (id: EntityId): number => {
  return typeof id === 'number' ? id : parseInt(id, 10);
};