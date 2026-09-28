import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { getInsights } from './insights.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', getInsights);

export default router;
