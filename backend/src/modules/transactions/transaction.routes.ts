import { Router } from 'express';
import { createTransactionHandler, whatsappWebhookHandler } from './transaction.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

const router = Router();

// Authenticated transaction creation
router.post('/transactions', requireAuth, createTransactionHandler);

// Public webhook endpoint for WhatsApp Twilio / Webhook callbacks
router.post('/webhooks/whatsapp', whatsappWebhookHandler);

export default router;
