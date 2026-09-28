import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const NOTIFICATION_TYPES = ['budget', 'anomaly', 'goal', 'health', 'prediction'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    read: { type: Boolean, default: false },
    sourceId: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, sourceId: 1 }, { unique: true });
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
