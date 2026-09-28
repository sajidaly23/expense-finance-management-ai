import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IAssistantMessage extends Document {
  userId: Types.ObjectId;
  role: 'user' | 'assistant';
  text: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const assistantMessageSchema = new Schema<IAssistantMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    source: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

assistantMessageSchema.index({ userId: 1, createdAt: 1 });

export const AssistantMessage: Model<IAssistantMessage> =
  mongoose.models.AssistantMessage ||
  mongoose.model<IAssistantMessage>('AssistantMessage', assistantMessageSchema);
