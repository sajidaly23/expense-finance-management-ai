import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { show } from './summary.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', show);

export default router;
