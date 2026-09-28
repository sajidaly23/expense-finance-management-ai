import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { User, IUser } from './user.model.js';
import { ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from './auth.validation.js';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: IUser['role'];
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

function toPublicUser(user: IUser): PublicUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function signToken(user: PublicUser) {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    options
  );
}

export async function registerUser(input: RegisterInput) {
  assertDatabase();

  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    password: input.password,
  });

  const publicUser = toPublicUser(user);
  return { token: signToken(publicUser), user: publicUser };
}

export async function loginUser(input: LoginInput) {
  assertDatabase();

  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const matches = await user.comparePassword(input.password);
  if (!matches) {
    throw new AppError('Invalid email or password.', 401);
  }

  const publicUser = toPublicUser(user);
  return { token: signToken(publicUser), user: publicUser };
}

export async function getCurrentUser(userId: string) {
  assertDatabase();

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return toPublicUser(user);
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  assertDatabase();

  const message =
    'If an account exists for that email, password reset instructions have been sent.';
  const user = await User.findOne({ email: input.email.toLowerCase() }).select(
    '+resetPasswordToken +resetPasswordExpires'
  );

  if (!user) {
    return { message, resetUrl: undefined as string | undefined };
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = hashResetToken(token);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
  return {
    message,
    resetUrl: config.nodeEnv !== 'production' ? resetUrl : undefined,
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  assertDatabase();

  const user = await User.findOne({
    resetPasswordToken: hashResetToken(input.token),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password +resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new AppError('Reset link is invalid or has expired.', 400);
  }

  user.password = input.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  const publicUser = toPublicUser(user);
  return { token: signToken(publicUser), user: publicUser };
}
