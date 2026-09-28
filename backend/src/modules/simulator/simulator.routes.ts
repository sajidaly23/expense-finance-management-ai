import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { simulateSchema } from './simulator.validation.js';
import { simulate } from './simulator.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', validate(simulateSchema), simulate);

export default router;
