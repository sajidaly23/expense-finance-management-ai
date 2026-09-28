import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { exportPdf, show } from './tax.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', show);
router.get('/export.pdf', exportPdf);

export default router;
