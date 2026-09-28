import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { sendTransactionEmail, getUserAccountBalance } from '../../services/email.service.js';
import {
  createIncome,
  deleteIncome,
  getIncome,
  listIncomes,
  updateIncome,
} from './income.service.js';
import { listIncomeQuerySchema } from './income.validation.js';

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listIncomeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Invalid filters.', 400);
  }
  const result = await listIncomes(req.user!.id, parsed.data);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const show = asyncHandler(async (req: Request, res: Response) => {
  const income = await getIncome(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    income,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const income = await createIncome(req.user!.id, req.body);

  // Dynamic Logged-In User Detection & Async Email Alert
  const userEmail = req.user?.email;
  const userId = req.user?.id;
  if (userEmail && userId) {
    getUserAccountBalance(userId)
      .then((updatedBalance) => {
        return sendTransactionEmail({
          userEmail,
          type: 'Income',
          amount: income.amount,
          category: income.source || income.incomeType || 'Income',
          date: income.date || new Date(),
          description: income.description,
          updatedBalance,
        });
      })
      .catch((err) => console.error('[Income Alert Email Error]:', err));
  }

  res.status(201).json({
    status: 'success',
    message: 'Income entry saved.',
    income,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const income = await updateIncome(req.user!.id, paramId(req.params.id), req.body);
  res.status(200).json({
    status: 'success',
    message: 'Income entry updated.',
    income,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteIncome(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    message: 'Income entry deleted.',
  });
});
