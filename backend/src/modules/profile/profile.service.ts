import { AppError } from '../../utils/AppError.js';
import { isDatabaseConnected } from '../../config/db.js';
import { IUser, User } from '../auth/user.model.js';
import { UpdateProfileInput } from './profile.validation.js';

export type PublicProfile = {
  name: string;
  email: string;
  occupation: string;
  age: number | null;
  monthlyIncome: number | null;
  familySize: number;
  financialGoal: IUser['financialGoal'] | null;
  riskPreference: IUser['riskPreference'] | null;
};

function assertDatabase() {
  if (!isDatabaseConnected()) {
    throw new AppError('Database is not connected. Try again in a moment.', 503);
  }
}

export function toPublicProfile(user: IUser): PublicProfile {
  return {
    name: user.name,
    email: user.email,
    occupation: user.occupation || '',
    age: user.age ?? null,
    monthlyIncome: user.monthlyIncome ?? null,
    familySize: user.familySize || 1,
    financialGoal: user.financialGoal || null,
    riskPreference: user.riskPreference || null,
  };
}

export async function getProfile(userId: string) {
  assertDatabase();
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return toPublicProfile(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  assertDatabase();
  const user = await User.findByIdAndUpdate(
    userId,
    {
      name: input.name,
      occupation: input.occupation || '',
      age: input.age,
      monthlyIncome: input.monthlyIncome,
      familySize: input.familySize,
      financialGoal: input.financialGoal,
      riskPreference: input.riskPreference,
    },
    { new: true, runValidators: true }
  );
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return toPublicProfile(user);
}
