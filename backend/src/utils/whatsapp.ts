import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

let client: twilio.Twilio | null = null;
if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
  } catch (err) {
    console.error('[Twilio] Initialization error:', err);
  }
}

export async function sendWhatsAppNotification(to: string, message: string): Promise<boolean> {
  if (!client) {
    console.log('[WhatsApp] Twilio client not configured. Skipping WhatsApp dispatch to:', to);
    return false;
  }

  try {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    await client.messages.create({
      from: fromNumber,
      to: formattedTo,
      body: message,
    });
    return true;
  } catch (err) {
    console.error('[WhatsApp] Send error:', err);
    return false;
  }
}

export interface ParsedWhatsAppMessage {
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  category: string;
  description: string;
}

/**
 * Natural language parser for incoming WhatsApp messages
 * e.g., "Spent 500 on Lunch", "Paid 3500 for Fuel", "Received 85000 Salary"
 */
export function parseWhatsAppExpenseText(text: string): ParsedWhatsAppMessage | null {
  if (!text) return null;
  const clean = text.trim();

  const expenseRegex = /(?:spent|paid|expense|buy|bought|cost)\s+(?:rs\.?|pkr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:on|for)?\s*(.*)/i;
  const incomeRegex = /(?:received|got|income|salary|deposit|earned)\s+(?:rs\.?|pkr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:from|for)?\s*(.*)/i;

  let match = clean.match(expenseRegex);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    const desc = match[2]?.trim() || 'General Expense';
    let category = 'Other Expense';

    if (/lunch|dinner|food|burger|pizza|tea|coffee|biryani|restaurant|cafe|snack|breakfast/i.test(desc)) {
      category = 'Food & Dining';
    } else if (/fuel|petrol|diesel|uber|careem|taxi|ride|indrive|bus/i.test(desc)) {
      category = 'Transportation';
    } else if (/bill|electric|iesco|k-electric|gas|wifi|internet|mobile|ptcl/i.test(desc)) {
      category = 'Utilities';
    } else if (/groceries|mart|store|supermarket|vegetable|fruit|milk/i.test(desc)) {
      category = 'Groceries';
    } else if (/rent|maintenance|house/i.test(desc)) {
      category = 'Housing';
    } else if (/medicine|doctor|pharmacy|hospital|health/i.test(desc)) {
      category = 'Healthcare';
    } else if (/movie|netflix|game|entertainment|shopping|clothes/i.test(desc)) {
      category = 'Entertainment';
    }

    return { type: 'EXPENSE', amount, category, description: desc };
  }

  match = clean.match(incomeRegex);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    const desc = match[2]?.trim() || 'Income';
    let category = 'Salary';

    if (/freelance|upwork|fiverr|client|project/i.test(desc)) {
      category = 'Freelance';
    } else if (/dividend|profit|stock|crypto|investment/i.test(desc)) {
      category = 'Investment';
    } else if (/gift|bonus|allowance/i.test(desc)) {
      category = 'Bonus';
    }

    return { type: 'INCOME', amount, category, description: desc };
  }

  return null;
}
