// Socket message types
export enum SocketMessageType {
  CONNECTION = 'connection',
  MESSAGE = 'message',
  TYPING = 'typing',
  STATUS = 'status',
  USER = 'user',
  CONVERSATION = 'conversation',
  ERROR = 'error'
}

// Socket payload interfaces
export interface MessagePayload {
  message: {
    id: number;
    conversationId: number;
    userId: number;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    sentAt: Date;
    deliveredAt?: Date;
    status: string;
  };
}

export interface TypingPayload {
  conversationId: number;
  userId: number;
  isTyping: boolean;
}

export interface StatusPayload {
  messageId: number;
  userId: number;
  isRead: boolean;
}

export interface UserPayload {
  userId: number;
  auth?: boolean;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface ConversationPayload {
  conversation: {
    id: number;
    name?: string;
    isGroup: boolean;
    createdAt: Date;
    updatedAt: Date;
    avatarUrl?: string;
    lastMessageId?: number;
  };
  participants?: any[];
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

// Socket message interface
export interface SocketMessage {
  type: SocketMessageType;
  payload: MessagePayload | TypingPayload | StatusPayload | UserPayload | ConversationPayload | ErrorPayload | any;
}

// Helper to create WebSocket connection
export const createWebSocketConnection = (token: string): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  return new WebSocket(wsUrl);
};
