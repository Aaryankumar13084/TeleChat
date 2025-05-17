import mongoose, { Schema, Document } from 'mongoose';
import { Conversation } from '@shared/schema';

export interface IConversation extends Conversation, Document {}

const conversationSchema = new Schema({
  name: {
    type: String,
    default: null
  },
  isGroup: {
    type: Boolean,
    default: false,
    required: true
  },
  avatarUrl: {
    type: String,
    default: null
  },
  lastMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
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