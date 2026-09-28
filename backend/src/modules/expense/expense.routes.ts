import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { create, list, remove, show, update } from './expense.controller.js';
import { createExpenseSchema, updateExpenseSchema } from './expense.validation.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', validate(createExpenseSchema), create);
router.get('/:id', show);
router.patch('/:id', validate(updateExpenseSchema), update);
router.delete('/:id', remove);

export default router;
