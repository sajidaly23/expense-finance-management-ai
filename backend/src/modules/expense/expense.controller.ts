import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { sendTransactionEmail, getUserAccountBalance } from '../../services/email.service.js';
import {
  createExpense,
  deleteExpense,
  getExpense,
  listExpenses,
  updateExpense,
} from './expense.service.js';
import { listExpenseQuerySchema } from './expense.validation.js';

function paramId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || '';
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listExpenseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message || 'Invalid filters.', 400);
  }
  const result = await listExpenses(req.user!.id, parsed.data);
  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const show = asyncHandler(async (req: Request, res: Response) => {
  const expense = await getExpense(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    expense,
  });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const expense = await createExpense(req.user!.id, req.body);

  // Dynamic Logged-In User Detection & Async Email Alert
  const userEmail = req.user?.email;
  const userId = req.user?.id;
  if (userEmail && userId) {
    getUserAccountBalance(userId)
      .then((updatedBalance) => {
        return sendTransactionEmail({
          userEmail,
          type: 'Expense',
          amount: expense.amount,
          category: expense.category || 'Expense',
          date: expense.date || new Date(),
          description: expense.description,
          updatedBalance,
        });
      })
      .catch((err) => console.error('[Expense Alert Email Error]:', err));
  }

  res.status(201).json({
    status: 'success',
    message: 'Expense entry saved.',
    expense,
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const expense = await updateExpense(req.user!.id, paramId(req.params.id), req.body);
  res.status(200).json({
    status: 'success',
    message: 'Expense entry updated.',
    expense,
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await deleteExpense(req.user!.id, paramId(req.params.id));
  res.status(200).json({
    status: 'success',
    message: 'Expense entry deleted.',
  });
});
