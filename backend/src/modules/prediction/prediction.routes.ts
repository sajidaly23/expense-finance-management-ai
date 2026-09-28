import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { show, train } from './prediction.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', show);
router.post('/train', train);

export default router;
