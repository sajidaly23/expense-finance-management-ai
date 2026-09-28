import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { emergencyFund, show } from './score.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', show);
router.get('/emergency-fund', emergencyFund);

export default router;
