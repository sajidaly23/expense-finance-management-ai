import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { validateQuery } from '../../middleware/validate.js';
import { reportQuerySchema } from './report.validation.js';
import { exportExcel, exportPdf, show } from './report.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/', validateQuery(reportQuerySchema), show);
router.get('/export.pdf', validateQuery(reportQuerySchema), exportPdf);
router.get('/export.xls', validateQuery(reportQuerySchema), exportExcel);

export default router;
