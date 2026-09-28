import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { search } from './search.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', search);

export default router;
