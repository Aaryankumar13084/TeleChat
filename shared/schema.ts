import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
  avatarUrl: true,
  bio: true,
});

// Conversation schema (can be one-on-one or group)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  name: text("name"), // Only for group conversations
  isGroup: boolean("is_group").default(false).notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  avatarUrl: text("avatar_url"), // For group chats
  lastMessageId: integer("last_message_id"), // Reference to the latest message
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  name: true,
  isGroup: true,
  avatarUrl: true,
});

// Participants in a conversation
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // References users.id
  conversationId: integer("conversation_id").notNull(), // References conversations.id
  isAdmin: boolean("is_admin").default(false).notNull(), // For group conversations
  joinedAt: timestamp("joined_at").notNull(),
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  userId: true,
  conversationId: true,
  isAdmin: true,
});

// Message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(), // References conversations.id
  userId: integer("user_id").notNull(), // References users.id (sender)
  content: text("content"), // Message text content
  mediaUrl: text("media_url"), // URL for image/file/media
  mediaType: text("media_type"), // Type of media: image, document, etc.
  sentAt: timestamp("sent_at").notNull(),
  deliveredAt: timestamp("delivered_at"), // When the message was delivered to server
  status: text("status").notNull(), // 'sent', 'delivered', 'seen'
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  userId: true,
  content: true,
  mediaUrl: true,
  mediaType: true,
});

// Message read status by participants
export const messageStatus = pgTable("message_status", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(), // References messages.id
  userId: integer("user_id").notNull(), // References users.id (reader)
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"), // When the message was read
});

export const insertMessageStatusSchema = createInsertSchema(messageStatus).pick({
  messageId: true,
  userId: true,
  isRead: true,
});

// WebSocket Schemas
export const wsMessageSchema = z.object({
  type: z.enum(['message', 'status', 'typing', 'user', 'conversation']),
  payload: z.any(),
});

// Message types
export const messageTypes = ['text', 'image', 'document'] as const;

// Define all the types we'll use throughout the application
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type MessageStatus = typeof messageStatus.$inferSelect;
export type InsertMessageStatus = z.infer<typeof insertMessageStatusSchema>;

export type WSMessage = z.infer<typeof wsMessageSchema>;
export type MessageType = typeof messageTypes[number];
