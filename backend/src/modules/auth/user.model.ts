import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'USER' | 'ADMIN';

export const FINANCIAL_GOALS = [
  'Save Money',
  'Buy a House',
  'Buy a Car',
  'Education',
  'Emergency Fund',
  'Investment',
  'Travel',
  'Other',
] as const;

export const RISK_PREFERENCES = ['Low', 'Medium', 'High'] as const;

export type FinancialGoal = (typeof FINANCIAL_GOALS)[number];
export type RiskPreference = (typeof RISK_PREFERENCES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  role: UserRole;
  occupation?: string;
  age?: number;
  monthlyIncome?: number;
  familySize?: number;
  financialGoal?: FinancialGoal;
  riskPreference?: RiskPreference;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
    occupation: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    age: {
      type: Number,
      min: 16,
      max: 100,
    },
    monthlyIncome: {
      type: Number,
      min: 0,
    },
    familySize: {
      type: Number,
      min: 1,
      max: 20,
      default: 1,
    },
    financialGoal: {
      type: String,
      enum: FINANCIAL_GOALS,
    },
    riskPreference: {
      type: String,
      enum: RISK_PREFERENCES,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);
