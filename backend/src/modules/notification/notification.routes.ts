import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { list, markAllRead, markRead } from './notification.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

export default router;
