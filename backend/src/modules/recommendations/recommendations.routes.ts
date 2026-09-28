import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { list } from './recommendations.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);

export default router;
