import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { ask, clear, messages, status } from './assistant.controller.js';
import { askAssistantSchema } from './assistant.service.js';

const router = Router();

router.use(requireAuth);
router.get('/status', status);
router.get('/messages', messages);
router.delete('/messages', clear);
router.post('/ask', validate(askAssistantSchema), ask);

export default router;
