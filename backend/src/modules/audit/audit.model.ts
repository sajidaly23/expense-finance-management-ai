import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Types.ObjectId;
  userName: string;
  action: string;
  module: string;
  ipAddress: string;
  method: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    ipAddress: { type: String, required: true, trim: true },
    method: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
