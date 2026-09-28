import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createNetWorthSchema, updateNetWorthSchema } from './networth.validation.js';
import { create, remove, summary, update } from './networth.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', summary);
router.post('/', validate(createNetWorthSchema), create);
router.patch('/:id', validate(updateNetWorthSchema), update);
router.delete('/:id', remove);

export default router;
