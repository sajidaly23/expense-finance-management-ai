import type { TaxEstimate } from './tax.service.js';

type RGB = [number, number, number];

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;

const INK: RGB = [0.06, 0.09, 0.16];
const MUTED: RGB = [0.39, 0.45, 0.55];
const LINE: RGB = [0.89, 0.91, 0.94];
const WHITE: RGB = [1, 1, 1];
const NAVY: RGB = [0.06, 0.09, 0.16];
const EMERALD: RGB = [0.02, 0.59, 0.41];
const TEAL: RGB = [0.05, 0.45, 0.55];

function formatRs(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString('en-US')}`;
}

function ascii(text: string) {
  return text.replace(/[^\x20-\x7E]/g, '?');
}

function pdfEscape(text: string) {
  return ascii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function rgb(color: RGB) {
  return `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}`;
}

class TaxPdf {
  private ops: string[] = [];
  private y = PAGE_H;

  constructor(
    private readonly estimate: TaxEstimate,
    private readonly userName: string
  ) {}

  build(): Buffer {
    this.drawHeader();
    this.drawTaxSummaryTable();
    this.drawSlabBreakdown();
    this.drawZakatSummary();
    this.drawNotes();
    this.drawFooter();

    const stream = this.ops.join('\n');

    const objects: string[] = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
      '2 0 obj << /Type /Pages /Count 1 /Kids [5 0 R] >> endobj\n',
      '3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n',
      `5 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 6 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >> endobj\n`,
      `6 0 obj << /Length ${Buffer.byteLength(stream, 'latin1')} >> stream\n${stream}\nendstream endobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'latin1'));
      pdf += object;
    }
    const xrefPos = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${offsets.length}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return Buffer.from(pdf, 'latin1');
  }

  private fillRect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.6) {
    this.ops.push(
      `${width} w ${rgb(color)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  }

  private text(value: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB } = {}) {
    const size = opts.size ?? 10;
    const font = opts.bold ? 'F2' : 'F1';
    const color = opts.color ?? INK;
    this.ops.push(
      `BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfEscape(value)}) Tj ET`
    );
  }

  private textRight(value: string, right: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB } = {}) {
    const size = opts.size ?? 10;
    const width = ascii(value).length * size * 0.5;
    this.text(value, right - width, y, opts);
  }

  private sectionTitle(title: string) {
    this.y -= 22;
    this.text(title.toUpperCase(), MARGIN, this.y, { size: 9, bold: true, color: TEAL });
    this.y -= 6;
    this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, LINE, 0.8);
    this.y -= 14;
  }

  private drawHeader() {
    this.fillRect(0, PAGE_H - 100, PAGE_W, 100, NAVY);
    this.fillRect(0, PAGE_H - 104, PAGE_W, 4, EMERALD);

    this.text('FEDERAL BOARD OF REVENUE (FBR) - TAX SUMMARY', MARGIN, PAGE_H - 35, {
      size: 11,
      bold: true,
      color: EMERALD,
    });
    this.textRight('FBR FORMAT PDF REPORT', PAGE_W - MARGIN, PAGE_H - 35, { size: 8, bold: true, color: WHITE });
    this.text('Annual Tax & Zakat Summary Statement', MARGIN, PAGE_H - 58, { size: 18, bold: true, color: WHITE });
    this.text(`Prepared for: ${this.userName}`, MARGIN, PAGE_H - 80, { size: 10, color: WHITE });
    this.textRight(`Tax Year: July 2025 - June 2026 (${this.estimate.taxYear})`, PAGE_W - MARGIN, PAGE_H - 80, {
      size: 10,
      bold: true,
      color: WHITE,
    });
    this.y = PAGE_H - 120;
  }

  private drawTaxSummaryTable() {
    this.sectionTitle('1. Taxable Income & Annual Tax Calculation');

    const rows = [
      { label: 'Estimated Annual Taxable Income', value: formatRs(this.estimate.taxableIncome), bold: true },
      { label: 'Income Calculation Source', value: this.estimate.incomeSource === 'ledger' ? 'Ledger Entries (July-June)' : 'Profile Annualized Income', bold: false },
      { label: 'Estimated Annual Income Tax (Salaried)', value: formatRs(this.estimate.annualTax), bold: true },
      { label: 'Estimated Monthly Withholding Tax', value: formatRs(this.estimate.monthlyWithholding), bold: false },
      { label: 'Effective Tax Rate', value: `${this.estimate.effectiveRate}%`, bold: true },
    ];

    for (const r of rows) {
      this.text(r.label, MARGIN + 10, this.y, { size: 10, bold: r.bold, color: INK });
      this.textRight(r.value, PAGE_W - MARGIN - 10, this.y, { size: 10, bold: r.bold, color: r.bold ? EMERALD : INK });
      this.y -= 8;
      this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, LINE, 0.4);
      this.y -= 14;
    }
  }

  private drawSlabBreakdown() {
    this.sectionTitle('2. FBR Salaried Tax Slab Reference (FY 2025-2026)');

    const slabs = [
      { range: 'Up to Rs. 600,000', rate: '0%' },
      { range: 'Rs. 600,001 - Rs. 1,200,000', rate: '5% of amount exceeding Rs. 600,000' },
      { range: 'Rs. 1,200,001 - Rs. 2,200,000', rate: 'Rs. 30,000 + 15% exceeding Rs. 1,200,000' },
      { range: 'Rs. 2,200,001 - Rs. 3,200,000', rate: 'Rs. 180,000 + 25% exceeding Rs. 2,200,000' },
      { range: 'Rs. 3,200,001 - Rs. 4,100,000', rate: 'Rs. 430,000 + 30% exceeding Rs. 3,200,000' },
      { range: 'Above Rs. 4,100,000', rate: 'Rs. 700,000 + 35% exceeding Rs. 4,100,000' },
    ];

    this.fillRect(MARGIN, this.y - 18, PAGE_W - MARGIN * 2, 22, NAVY);
    this.text('INCOME SLAB (ANNUAL)', MARGIN + 10, this.y - 13, { size: 9, bold: true, color: WHITE });
    this.textRight('APPLICABLE TAX RATE', PAGE_W - MARGIN - 10, this.y - 13, { size: 9, bold: true, color: WHITE });
    this.y -= 24;

    for (const s of slabs) {
      this.text(s.range, MARGIN + 10, this.y, { size: 9, color: INK });
      this.textRight(s.rate, PAGE_W - MARGIN - 10, this.y, { size: 9, color: MUTED });
      this.y -= 6;
      this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, LINE, 0.4);
      this.y -= 12;
    }
  }

  private drawZakatSummary() {
    this.sectionTitle('3. Wealth & Zakat Liability Estimate');

    const rows = [
      { label: 'Estimated Nisab Threshold (Silver / Cash Equivalent)', value: formatRs(this.estimate.nisab), bold: false },
      { label: 'Eligible Asset Base (Cash, Gold & Savings Goals)', value: formatRs(this.estimate.zakatBase), bold: true },
      { label: 'Estimated Zakat Due (2.5%)', value: formatRs(this.estimate.zakatDue), bold: true },
    ];

    for (const r of rows) {
      this.text(r.label, MARGIN + 10, this.y, { size: 10, bold: r.bold, color: INK });
      this.textRight(r.value, PAGE_W - MARGIN - 10, this.y, { size: 10, bold: r.bold, color: r.bold ? TEAL : INK });
      this.y -= 8;
      this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, LINE, 0.4);
      this.y -= 14;
    }
  }

  private drawNotes() {
    this.sectionTitle('4. Compliance Notes & Guidelines');

    for (const note of this.estimate.notes) {
      this.text(`• ${note}`, MARGIN + 10, this.y, { size: 9, color: MUTED });
      this.y -= 14;
    }
    this.text(`• ${this.estimate.slabSource}`, MARGIN + 10, this.y, { size: 8, color: MUTED });
    this.y -= 14;
  }

  private drawFooter() {
    this.line(MARGIN, 50, PAGE_W - MARGIN, 50, LINE, 0.8);
    this.text('SmartFin AI — Automated Financial & Tax Summary Statement (FBR Format)', MARGIN, 36, {
      size: 8,
      color: MUTED,
    });
    this.textRight('Generated by SmartFin AI', PAGE_W - MARGIN, 36, { size: 8, bold: true, color: EMERALD });
  }
}

export function buildTaxPdfBuffer(estimate: TaxEstimate, userName: string): Buffer {
  return new TaxPdf(estimate, userName).build();
}
