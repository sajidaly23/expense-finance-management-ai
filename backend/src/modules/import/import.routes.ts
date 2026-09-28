import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { importUpload } from '../../middleware/upload.js';
import { commit, preview, template, templateExpensesCsv, templateIncomeCsv } from './import.controller.js';

const router = Router();

router.get('/template', template);
router.get('/template/income.csv', templateIncomeCsv);
router.get('/template/expenses.csv', templateExpensesCsv);

router.use(requireAuth);
router.post('/preview', importUpload, preview);
router.post('/', importUpload, commit);

export default router;
