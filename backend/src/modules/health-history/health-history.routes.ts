import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { list, record } from './health-history.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/record', record);

export default router;
