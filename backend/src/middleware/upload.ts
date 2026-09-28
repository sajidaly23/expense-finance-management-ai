import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const name = file.originalname.toLowerCase();
    const allowed =
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv') ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel';
    if (!allowed) {
      callback(new AppError('Upload an Excel file (.xlsx, .xls) or CSV.', 400));
      return;
    }
    callback(null, true);
  },
});

export const importUpload = upload.single('file');
