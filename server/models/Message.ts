import mongoose, { Schema, Document } from 'mongoose';
import { Message } from '@shared/schema';

export interface IMessage extends Omit<Message, 'id'>, Document {
  id: string;
}

const messageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: null
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    default: null,
    enum: [null, 'text', 'image', 'document']
  },
  sentAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    required: true,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
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

export const MessageModel = mongoose.model<IMessage>('Message', messageSchema);