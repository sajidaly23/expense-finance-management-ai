import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { create, list, remove, show, update } from './income.controller.js';
import { createIncomeSchema, updateIncomeSchema } from './income.validation.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', validate(createIncomeSchema), create);
router.get('/:id', show);
router.patch('/:id', validate(updateIncomeSchema), update);
router.delete('/:id', remove);

export default router;
