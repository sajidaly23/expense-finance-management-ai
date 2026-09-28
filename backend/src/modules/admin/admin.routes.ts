import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import { overview, setRole, users } from './admin.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);
router.get('/overview', overview);
router.get('/users', users);
router.patch('/users/:id/role', setRole);

export default router;
