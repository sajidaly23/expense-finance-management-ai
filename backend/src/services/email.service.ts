import { Resend } from 'resend';
import mongoose from 'mongoose';
import { Income } from '../modules/income/income.model.js';
import { Expense } from '../modules/expense/expense.model.js';

export interface SendTransactionEmailParams {
  userEmail: string;
  type: 'Income' | 'Expense' | 'Receipt Scan' | string;
  amount: number;
  category: string;
  date: string | Date;
  updatedBalance?: number | null;
  userName?: string;
  description?: string;
  isAnomaly?: boolean;
  anomalyReason?: string;
}

export interface EmailServiceResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Helper to calculate the current updated net balance for a user.
 */
export async function getUserAccountBalance(
  userId: string | mongoose.Types.ObjectId
): Promise<number> {
  try {
    const objectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    const [incomeAgg, expenseAgg] = await Promise.all([
      Income.aggregate([
        { $match: { userId: objectId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.aggregate([
        { $match: { userId: objectId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalIncome = incomeAgg[0]?.total || 0;
    const totalExpense = expenseAgg[0]?.total || 0;
    return totalIncome - totalExpense;
  } catch (err) {
    console.error('[EmailService] Failed to calculate user balance:', err);
    return 0;
  }
}

/**
 * Generate a responsive, professional HTML card for the transaction email.
 */
function buildTransactionEmailHtml(params: SendTransactionEmailParams): string {
  const {
    userEmail,
    type,
    amount,
    category,
    date,
    updatedBalance,
    userName,
    description,
    isAnomaly,
    anomalyReason,
  } = params;

  const normalizedType = type.toUpperCase();
  const isIncome = normalizedType === 'INCOME';
  const isExpense = normalizedType === 'EXPENSE';
  const isReceipt = !isIncome && !isExpense;

  // Theming colors
  const accentColor = isIncome ? '#10B981' : isExpense ? '#F43F5E' : '#6366F1';
  const badgeBg = isIncome ? 'rgba(16, 185, 129, 0.15)' : isExpense ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)';
  const badgeText = isIncome ? '+ INCOME LOGGED' : isExpense ? '- EXPENSE RECORDED' : '📷 RECEIPT SCAN PROCESSED';
  const sign = isIncome ? '+' : isExpense ? '-' : '';

  // Format date and time
  const dateObj = date ? new Date(date) : new Date();
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateTimeDisplay = `${formattedDate} at ${formattedTime}`;

  // Formatted amount
  const formattedAmount = Number(amount || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Balance display
  const balanceDisplay =
    typeof updatedBalance === 'number'
      ? `PKR ${updatedBalance.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'Synced to Ledger';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartFin AI — Transaction Alert</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #0B1120;
      padding: 32px 16px;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #1E293B;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header-bar {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      padding: 24px 28px;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-container {
      font-size: 20px;
      font-weight: 800;
      color: #F8FAFC;
      letter-spacing: -0.5px;
    }
    .logo-badge {
      color: #10B981;
      font-size: 13px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .body-content {
      padding: 32px 28px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
      background-color: ${badgeBg};
      color: ${accentColor};
      border: 1px solid ${accentColor}40;
      margin-bottom: 14px;
    }
    .amount-display {
      font-size: 36px;
      font-weight: 800;
      color: ${accentColor};
      margin: 0 0 8px 0;
      letter-spacing: -1px;
    }
    .greeting {
      font-size: 14px;
      color: #94A3B8;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .card-table {
      width: 100%;
      background-color: #0F172A;
      border: 1px solid #334155;
      border-radius: 12px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    .card-table td {
      padding: 13px 18px;
      font-size: 14px;
      border-bottom: 1px solid #1E293B;
    }
    .card-table tr:last-child td {
      border-bottom: none;
    }
    .label {
      color: #94A3B8;
      font-weight: 500;
      width: 42%;
    }
    .value {
      color: #F8FAFC;
      font-weight: 600;
      text-align: right;
    }
    .highlight-balance {
      color: #38BDF8;
      font-weight: 700;
    }
    .anomaly-card {
      background-color: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.35);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .anomaly-title {
      color: #FB7185;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .anomaly-desc {
      color: #FDA4AF;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
    }
    .footer {
      background-color: #0F172A;
      padding: 24px 28px;
      border-top: 1px solid #334155;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      line-height: 1.6;
    }
    .footer-brand {
      color: #94A3B8;
      font-weight: 600;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="container" role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <!-- HEADER -->
      <tr>
        <td class="header-bar">
          <table width="100%" role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span class="logo-container">SmartFin<span class="logo-badge">AI</span></span>
              </td>
              <td align="right">
                <span style="font-size: 12px; color: #94A3B8; font-weight: 500;">Real-Time Alert</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td class="body-content">
          <div class="badge">${badgeText}</div>
          <h1 class="amount-display">${sign} PKR ${formattedAmount}</h1>
          <p class="greeting">
            Hello${userName ? ` <strong>${userName}</strong>` : ''}, your recent financial activity has been securely processed.
          </p>

          <table class="card-table" role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td class="label">Transaction Type</td>
              <td class="value">${type}</td>
            </tr>
            <tr>
              <td class="label">Amount</td>
              <td class="value" style="color: ${accentColor}; font-weight: 700;">PKR ${formattedAmount}</td>
            </tr>
            <tr>
              <td class="label">Category</td>
              <td class="value">${category || 'Uncategorized'}</td>
            </tr>
            <tr>
              <td class="label">Date & Time</td>
              <td class="value">${dateTimeDisplay}</td>
            </tr>
            ${
              description
                ? `<tr>
                    <td class="label">Description / Merchant</td>
                    <td class="value">${description}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td class="label">Updated Balance / Summary</td>
              <td class="value highlight-balance">${balanceDisplay}</td>
            </tr>
          </table>

          ${
            isAnomaly
              ? `<div class="anomaly-card">
                  <div class="anomaly-title">⚠️ Budget Threshold Alert</div>
                  <p class="anomaly-desc">${anomalyReason || 'This transaction significantly exceeds your budget baseline.'}</p>
                </div>`
              : ''
          }
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td class="footer">
          <div class="footer-brand">SmartFin AI • Personal Finance & Expense Prediction System</div>
          <div>This automated alert was dispatched to <strong>${userEmail}</strong>.</div>
          <div style="margin-top: 6px; font-size: 11px; color: #475569;">
            Protected by SmartFin AI 256-bit encryption • Cloud Ledger
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Reusable function to send transaction alert email via Resend.
 * Gracefully logs errors to server console without breaking caller transaction flow.
 */
export async function sendTransactionEmail(
  params: SendTransactionEmailParams
): Promise<EmailServiceResult> {
  const { userEmail, type, amount, category, date } = params;

  if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
    console.warn('[EmailService] sendTransactionEmail skipped: Invalid recipient email provided.', { userEmail });
    return { success: false, error: 'Invalid or missing userEmail' };
  }

  // In test environment, skip live network calls to preserve API quota and avoid rate limits
  if (process.env.NODE_ENV === 'test') {
    return { success: true, id: 'test-email-mock-id' };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    console.warn('[EmailService] sendTransactionEmail skipped: RESEND_API_KEY is not configured in .env');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const resend = new Resend(resendApiKey);
    const fromAddress = process.env.RESEND_FROM?.trim() || 'SmartFin AI <onboarding@resend.dev>';
    const subject = 'SmartFin AI — Transaction Alert 💸';
    const html = buildTransactionEmailHtml(params);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [userEmail.trim()],
      subject,
      html,
    });

    if (error) {
      console.error('[EmailService] Resend email delivery failed:', error);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Transaction alert email sent successfully to ${userEmail} (ID: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (error: any) {
    // Graceful error handling - log to server console without throwing
    console.error('[EmailService] Unexpected error sending transaction email:', error?.message || error);
    return { success: false, error: error?.message || 'Unexpected email sending error' };
  }
}
