import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { exportData, removeAccount, show, update } from './profile.controller.js';
import { updateProfileSchema } from './profile.validation.js';
import { z } from 'zod';

const router = Router();

const deleteAccountSchema = z.object({
  password: z.string().min(6),
});

router.use(requireAuth);
router.get('/', show);
router.patch('/', validate(updateProfileSchema), update);
router.get('/export', exportData);
router.delete('/account', validate(deleteAccountSchema), removeAccount);

export default router;
