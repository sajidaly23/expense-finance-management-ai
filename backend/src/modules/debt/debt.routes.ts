import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { createDebtSchema, updateDebtSchema } from './debt.validation.js';
import { create, list, remove, update } from './debt.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/', validate(createDebtSchema), create);
router.patch('/:id', validate(updateDebtSchema), update);
router.delete('/:id', remove);

export default router;
