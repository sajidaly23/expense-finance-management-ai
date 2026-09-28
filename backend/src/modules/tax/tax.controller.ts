import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { estimateTax } from './tax.service.js';
import { buildTaxPdfBuffer } from './tax.pdf.js';

export const show = asyncHandler(async (req: Request, res: Response) => {
  const estimate = await estimateTax(req.user!.id);
  res.status(200).json({ status: 'success', estimate });
});

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const estimate = await estimateTax(req.user!.id);
  const userName = req.user?.email || 'Taxpayer';
  const buffer = buildTaxPdfBuffer(estimate, userName);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="smartfin-annual-tax-summary-2025-2026.pdf"');
  res.send(buffer);
});
