import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { validate } from '../../middleware/validate.js';
import { importMissingSchema, reconcileSchema } from './reconcile.validation.js';
import { importRows, match } from './reconcile.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/', validate(reconcileSchema), match);
router.post('/import', validate(importMissingSchema), importRows);

export default router;
