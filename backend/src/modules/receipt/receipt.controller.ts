import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { parseReceiptData } from './receipt.service.js';
import { sendTransactionEmail, getUserAccountBalance } from '../../services/email.service.js';

export const scanReceipt = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const { base64Image, fileName } = req.body || {};

  if (!file && !base64Image) {
    throw new AppError('Upload a receipt image before scanning.', 400);
  }

  const parsed = await parseReceiptData(file?.buffer, base64Image, file?.originalname || fileName, file?.mimetype);

  // Dynamic Logged-In User Detection: Extract user email from JWT session
  const userEmail = req.user?.email;
  const userId = req.user?.id;

  // Asynchronously dispatch transaction alert email without blocking response
  if (userEmail && userId) {
    const amount = parsed.totalAmount?.value || 0;
    const category = parsed.category?.value || 'Receipt Scan';
    const date = parsed.receiptDate?.value ? new Date(parsed.receiptDate.value) : new Date();
    const description = parsed.description?.value || parsed.merchantName?.value || 'AI Receipt Scan';

    getUserAccountBalance(userId)
      .then((updatedBalance) => {
        return sendTransactionEmail({
          userEmail,
          type: 'Receipt Scan',
          amount,
          category,
          date,
          description,
          updatedBalance,
        });
      })
      .catch((err) => {
        console.error('[Receipt Scan Email Dispatch Error]:', err);
      });
  }

  res.status(200).json({
    status: 'success',
    receipt: parsed,
    warnings: parsed.warnings,
    reviewRequired: parsed.reviewRequired,
  });
});

