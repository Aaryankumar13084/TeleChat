import mongoose, { Schema, Document } from 'mongoose';
import { Participant } from '@shared/schema';

export interface IParticipant extends Omit<Participant, 'id'>, Document {
  id: string;
}

const participantSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Create a compound index to ensure a user can only be added to a conversation once
participantSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

export const ParticipantModel = mongoose.model<IParticipant>('Participant', participantSchema);