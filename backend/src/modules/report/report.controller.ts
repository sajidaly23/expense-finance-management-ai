import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  buildExcelBuffer,
  buildPdfBuffer,
  buildReport,
  exportFilename,
  listReportMonths,
} from './report.service.js';

function monthKeyFromDate(value: Date) {
  return value.toISOString().slice(0, 7);
}

export const show = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const [report, availableMonths] = await Promise.all([
    buildReport(req.user!.id, month),
    listReportMonths(req.user!.id),
  ]);

  res.status(200).json({
    status: 'success',
    report,
    availableMonths,
    currentMonthKey: monthKeyFromDate(new Date()),
  });
});

export const exportPdf = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const report = await buildReport(req.user!.id, month);
  const filename = exportFilename(report, 'pdf');
  const buffer = buildPdfBuffer(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

export const exportExcel = asyncHandler(async (req: Request, res: Response) => {
  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const report = await buildReport(req.user!.id, month);
  const filename = exportFilename(report, 'xls');
  const buffer = buildExcelBuffer(report);
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});
