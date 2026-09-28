import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { list, process } from './recurring.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/process', process);

export default router;
