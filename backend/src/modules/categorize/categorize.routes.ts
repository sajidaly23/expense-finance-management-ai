import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { duplicates, suggest } from './categorize.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/suggest', suggest);
router.get('/duplicates', duplicates);

export default router;
