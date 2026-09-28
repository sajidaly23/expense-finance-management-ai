import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendTransactionEmail, getUserAccountBalance } from '../../services/email.service.js';
import { sendWhatsAppNotification, parseWhatsAppExpenseText } from '../../utils/whatsapp.js';
import { Expense } from '../expense/expense.model.js';
import { Income } from '../income/income.model.js';
import { Budget } from '../budget/budget.model.js';
import { User } from '../auth/user.model.js';

export async function createTransactionHandler(req: Request, res: Response) {
  try {
    const userId = req.user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { type, amount, category, date, description, paymentMethod, incomeType } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields (type, amount, category)' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let isAnomaly = false;
    let anomalyReason = '';
    let record: any;

    if (type.toUpperCase() === 'EXPENSE') {
      // Check budget thresholds for category
      const currentMonth = new Date().toISOString().slice(0, 7);
      const budget = await Budget.findOne({ userId, category, month: currentMonth });
      
      if (budget && budget.amount > 0) {
        if (numAmount > budget.amount * 0.8) {
          isAnomaly = true;
          anomalyReason = `Expense Rs. ${numAmount.toLocaleString()} is over 80% of your PKR ${budget.amount.toLocaleString()} ${category} monthly budget.`;
        }
      }

      record = await Expense.create({
        userId,
        amount: numAmount,
        category,
        date: date ? new Date(date) : new Date(),
        description: description || '',
        paymentMethod: paymentMethod || 'Cash',
        transactionType: 'NEED',
        recurring: false,
      });
    } else {
      const validIncomeTypes = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];
      const resolvedIncomeType = validIncomeTypes.includes(incomeType)
        ? incomeType
        : validIncomeTypes.includes(category)
        ? category
        : 'Other';

      record = await Income.create({
        userId,
        amount: numAmount,
        source: category || 'Income',
        date: date ? new Date(date) : new Date(),
        incomeType: resolvedIncomeType,
        description: description || '',
        recurring: false,
      });
    }

    // Calculate aggregated updated net balance
    const updatedBalance = await getUserAccountBalance(userId);

    // Extract logged-in user email dynamically from current auth session/token or user document
    const loggedInEmail = req.user?.email || user.email;

    // Asynchronously dispatch transaction alert email via Resend without blocking client response
    if (loggedInEmail) {
      sendTransactionEmail({
        userEmail: loggedInEmail,
        userName: user.name,
        type: type.toUpperCase() === 'EXPENSE' ? 'Expense' : 'Income',
        amount: numAmount,
        category,
        date: (record.date || new Date()).toISOString(),
        description,
        updatedBalance,
        isAnomaly,
        anomalyReason,
      }).catch((err) => console.error('[Transaction Alert Email Error]:', err));
    }

    // Asynchronously dispatch WhatsApp notification
    if (user.phone) {
      const isExp = type.toUpperCase() === 'EXPENSE';
      const msg = isExp
        ? `🔔 *SmartFin Expense Alert*\n💸 Spent: *PKR ${numAmount.toLocaleString()}* on *${category}*.\n💰 Updated Net Balance: *PKR ${updatedBalance.toLocaleString()}*${isAnomaly ? `\n⚠️ *Warning:* ${anomalyReason}` : ''}`
        : `🔔 *SmartFin Income Alert*\n💵 Received: *PKR ${numAmount.toLocaleString()}* (${category}).\n💰 Updated Net Balance: *PKR ${updatedBalance.toLocaleString()}*`;

      sendWhatsAppNotification(user.phone, msg).catch((err) =>
        console.error('[WhatsApp Async Dispatch Error]:', err)
      );
    }

    return res.status(201).json({
      success: true,
      data: record,
      updatedBalance,
      isAnomaly,
      anomalyReason: isAnomaly ? anomalyReason : undefined,
    });
  } catch (error: any) {
    console.error('Create Transaction Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
}

export async function whatsappWebhookHandler(req: Request, res: Response) {
  try {
    const { From, Body } = req.body;
    const phoneNumber = (From || '').replace('whatsapp:', '').trim();

    if (!phoneNumber || !Body) {
      return res.status(200).send('<Response></Response>');
    }

    // Match user by registered phone
    const user = await User.findOne({
      phone: { $regex: new RegExp(phoneNumber.replace('+', '\\+'), 'i') },
    });

    if (!user) {
      return res
        .status(200)
        .send(
          '<Response><Message>Your WhatsApp phone number is not linked to any SmartFin account.</Message></Response>'
        );
    }

    const parsed = parseWhatsAppExpenseText(Body);
    if (!parsed) {
      const helpMsg =
        'Could not parse transaction.\nExamples:\n• "Spent 500 on Lunch"\n• "Paid 3500 for Fuel"\n• "Received 85000 Salary"';
      await sendWhatsAppNotification(phoneNumber, helpMsg);
      return res.status(200).send('<Response></Response>');
    }

    let record: any;
    if (parsed.type === 'EXPENSE') {
      record = await Expense.create({
        userId: user._id,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: new Date(),
        paymentMethod: 'Cash',
        transactionType: 'NEED',
        recurring: false,
      });
    } else {
      const validIncomeTypes = ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'];
      const resolvedIncomeType = validIncomeTypes.includes(parsed.category)
        ? parsed.category
        : 'Other';

      record = await Income.create({
        userId: user._id,
        amount: parsed.amount,
        source: parsed.description || parsed.category || 'Income',
        date: new Date(),
        incomeType: resolvedIncomeType,
        description: parsed.description,
        recurring: false,
      });
    }

    const confirmMsg = `✅ *SmartFin Logged!*\n• Type: *${parsed.type}*\n• Amount: *PKR ${parsed.amount.toLocaleString()}*\n• Category: *${parsed.category}*\n• Note: ${parsed.description}`;
    await sendWhatsAppNotification(phoneNumber, confirmMsg);

    return res.status(200).send('<Response></Response>');
  } catch (err: any) {
    console.error('WhatsApp Webhook Error:', err);
    return res.status(500).send('<Response></Response>');
  }
}
