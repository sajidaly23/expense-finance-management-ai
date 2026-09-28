import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { getSubscriptions } from './subscriptions.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', getSubscriptions);

export default router;
