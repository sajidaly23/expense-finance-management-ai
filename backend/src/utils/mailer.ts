import { sendTransactionEmail as sendResendEmail, SendTransactionEmailParams, getUserAccountBalance } from '../services/email.service.js';

export { getUserAccountBalance };

export interface ReceiptEmailPayload {
  to: string;
  userName: string;
  type: 'INCOME' | 'EXPENSE' | 'Receipt Scan' | string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  updatedBalance: number;
  isAnomaly?: boolean;
  anomalyReason?: string;
}

export async function sendTransactionEmail(payload: ReceiptEmailPayload | SendTransactionEmailParams): Promise<boolean> {
  const userEmail = 'userEmail' in payload ? payload.userEmail : payload.to;
  const result = await sendResendEmail({
    userEmail,
    type: payload.type === 'INCOME' ? 'Income' : payload.type === 'EXPENSE' ? 'Expense' : payload.type,
    amount: payload.amount,
    category: payload.category,
    date: payload.date,
    updatedBalance: payload.updatedBalance,
    userName: payload.userName,
    description: payload.description,
    isAnomaly: payload.isAnomaly,
    anomalyReason: payload.anomalyReason,
  });

  return result.success;
}
