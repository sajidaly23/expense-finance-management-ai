import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { list, scan, update } from './anomaly.controller.js';
import { updateAnomalySchema } from './anomaly.service.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/scan', scan);
router.patch('/:id', validate(updateAnomalySchema), update);

export default router;
