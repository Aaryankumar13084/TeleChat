import mongoose, { Schema, Document } from 'mongoose';
import { Conversation } from '@shared/schema';

export interface IConversation extends Omit<Conversation, 'id'>, Document {
  id: string;
}

const conversationSchema = new Schema({
  name: {
    type: String,
    default: null
  },
  isGroup: {
    type: Boolean,
    required: true,
    default: false
  },
  avatarUrl: {
    type: String,
    default: null
  },
  lastMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const ConversationModel = mongoose.model<IConversation>('Conversation', conversationSchema);