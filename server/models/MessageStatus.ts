import mongoose, { Schema, Document } from 'mongoose';
import { MessageStatus } from '@shared/schema';

export interface IMessageStatus extends Omit<MessageStatus, 'id'>, Document {
  id: string;
}

const messageStatusSchema = new Schema({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    required: true
  },
  readAt: {
    type: Date,
    default: null
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

// Create a compound index to ensure a user can only have one status per message
messageStatusSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export const MessageStatusModel = mongoose.model<IMessageStatus>('MessageStatus', messageStatusSchema);