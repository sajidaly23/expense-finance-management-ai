import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { create, list, remove, show, update } from './budget.controller.js';
import { createBudgetSchema, updateBudgetSchema } from './budget.validation.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);
router.post('/', validate(createBudgetSchema), create);
router.get('/:id', show);
router.patch('/:id', validate(updateBudgetSchema), update);
router.delete('/:id', remove);

export default router;
