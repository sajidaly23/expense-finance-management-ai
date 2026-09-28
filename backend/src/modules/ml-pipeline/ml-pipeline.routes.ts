import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { run } from './ml-pipeline.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/run', run);

export default router;
