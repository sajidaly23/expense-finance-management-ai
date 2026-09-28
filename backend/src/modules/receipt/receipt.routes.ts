import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../auth/auth.middleware.js';
import { scanReceipt } from './receipt.controller.js';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type. Upload a JPG, PNG, or WEBP receipt image.'));
  },
});
const router = Router();

router.use(requireAuth);
router.post('/scan', upload.single('receipt'), scanReceipt);

export default router;
