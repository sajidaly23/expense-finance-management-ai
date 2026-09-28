import type { PublicReport } from './report.service.js';

type RGB = [number, number, number];

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;
const FOOTER_Y = 36;

const INK: RGB = [0.06, 0.09, 0.16];
const MUTED: RGB = [0.39, 0.45, 0.55];
const LINE: RGB = [0.89, 0.91, 0.94];
const PAPER: RGB = [0.97, 0.98, 0.99];
const WHITE: RGB = [1, 1, 1];
const NAVY: RGB = [0.06, 0.09, 0.16];
const EMERALD: RGB = [0.02, 0.59, 0.41];
const AMBER: RGB = [0.85, 0.47, 0.02];
const ROSE: RGB = [0.88, 0.11, 0.28];
const PURPLE: RGB = [0.49, 0.23, 0.93];
const SLATE: RGB = [0.95, 0.96, 0.98];

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

function wrapText(text: string, maxChars: number) {
  const words = ascii(text).split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function healthColor(status: string | undefined): RGB {
  if (status === 'Excellent' || status === 'Good') return EMERALD;
  if (status === 'Moderate') return AMBER;
  return ROSE;
}

class StatementPdf {
  private pages: string[] = [];
  private ops: string[] = [];
  private y = PAGE_H;
  private pageIndex = 0;

  constructor(private readonly report: PublicReport) {}

  build(): Buffer {
    this.drawCoverHeader();
    this.drawKpis();
    this.drawCategoryTable();
    this.drawIncomeDetails();
    this.drawExpenseDetails();
    this.drawBudgetTable();
    this.drawOutlook();
    this.drawGoals();
    this.drawSummary();
    this.flushPage();
    return this.toBuffer();
  }

  private ensure(height: number) {
    if (this.y - height < FOOTER_Y + 18) {
      this.flushPage();
      this.drawContinuedHeader();
    }
  }

  private fillRect(x: number, y: number, w: number, h: number, color: RGB) {
    this.ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  private strokeRect(x: number, y: number, w: number, h: number, color: RGB, width = 0.6) {
    this.ops.push(`${width} w ${rgb(color)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
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
    this.ensure(28);
    this.y -= 18;
    this.text(title.toUpperCase(), MARGIN, this.y, { size: 8, bold: true, color: MUTED });
    this.y -= 6;
    this.line(MARGIN, this.y, PAGE_W - MARGIN, this.y, LINE, 0.8);
    this.y -= 10;
  }

  private drawCoverHeader() {
    const year = this.report.period.key.slice(0, 4);
    this.fillRect(0, PAGE_H - 92, PAGE_W, 92, NAVY);
    this.fillRect(0, PAGE_H - 96, PAGE_W, 4, EMERALD);
    this.text('SMARTFIN AI', MARGIN, PAGE_H - 36, { size: 11, bold: true, color: EMERALD });
    this.textRight('CONFIDENTIAL', PAGE_W - MARGIN, PAGE_H - 36, { size: 8, bold: true, color: WHITE });
    this.text('Monthly Financial Statement', MARGIN, PAGE_H - 58, { size: 20, bold: true, color: WHITE });
    this.text(`Prepared for ${this.report.preparedFor}`, MARGIN, PAGE_H - 78, { size: 10, color: WHITE });
    this.textRight(`${this.report.period.label} ${year}`, PAGE_W - MARGIN, PAGE_H - 78, {
      size: 10,
      bold: true,
      color: WHITE,
    });
    this.y = PAGE_H - 118;
  }

  private drawContinuedHeader() {
    this.fillRect(0, PAGE_H - 42, PAGE_W, 42, NAVY);
    this.fillRect(0, PAGE_H - 46, PAGE_W, 4, EMERALD);
    this.text('SmartFin AI  |  Monthly statement (continued)', MARGIN, PAGE_H - 26, {
      size: 10,
      bold: true,
      color: WHITE,
    });
    this.textRight(this.report.preparedFor, PAGE_W - MARGIN, PAGE_H - 26, { size: 9, color: WHITE });
    this.y = PAGE_H - 64;
  }

  private drawKpis() {
    const boxW = (PAGE_W - MARGIN * 2 - 16) / 3;
    const boxH = 62;
    this.ensure(boxH + 8);
    const cards = [
      { label: 'Income', value: formatRs(this.report.currentMonth.income), color: EMERALD },
      { label: 'Expenses', value: formatRs(this.report.currentMonth.expense), color: AMBER },
      {
        label: 'Net savings',
        value: `${formatRs(this.report.currentMonth.savings)}  (${this.report.currentMonth.savingsRate}%)`,
        color: PURPLE,
      },
    ];
    cards.forEach((card, index) => {
      const x = MARGIN + index * (boxW + 8);
      const y = this.y - boxH;
      this.fillRect(x, y, boxW, boxH, SLATE);
      this.fillRect(x, y, 4, boxH, card.color);
      this.strokeRect(x, y, boxW, boxH, LINE);
      this.text(card.label.toUpperCase(), x + 14, y + 40, { size: 8, bold: true, color: MUTED });
      this.text(card.value, x + 14, y + 18, { size: 12, bold: true, color: INK });
    });
    this.y -= boxH + 18;
  }

  private drawTable(headers: string[], rows: string[][], widths: number[]) {
    const rowH = 18;
    const headerH = 20;
    const tableW = widths.reduce((sum, w) => sum + w, 0);
    this.ensure(headerH + rowH + 8);

    const drawHeader = (y: number) => {
      this.fillRect(MARGIN, y - headerH + 4, tableW, headerH, NAVY);
      let x = MARGIN;
      headers.forEach((header, index) => {
        const pad = 8;
        if (index === headers.length - 1) {
          this.textRight(header, x + widths[index] - pad, y - 10, { size: 8, bold: true, color: WHITE });
        } else {
          this.text(header, x + pad, y - 10, { size: 8, bold: true, color: WHITE });
        }
        x += widths[index];
      });
    };

    drawHeader(this.y);
    this.y -= headerH;

    if (rows.length === 0) {
      this.ensure(rowH + 6);
      this.fillRect(MARGIN, this.y - rowH + 4, tableW, rowH, PAPER);
      this.strokeRect(MARGIN, this.y - rowH + 4, tableW, rowH, LINE);
      this.text('No records for this period.', MARGIN + 8, this.y - 8, { size: 9, color: MUTED });
      this.y -= rowH + 12;
      return;
    }

    rows.forEach((row, rowIndex) => {
      this.ensure(rowH + 6);
      if (this.y < FOOTER_Y + headerH + rowH + 24) {
        this.flushPage();
        this.drawContinuedHeader();
        drawHeader(this.y);
        this.y -= headerH;
      }
      const y = this.y - rowH + 4;
      this.fillRect(MARGIN, y, tableW, rowH, rowIndex % 2 === 0 ? WHITE : SLATE);
      this.strokeRect(MARGIN, y, tableW, rowH, LINE, 0.4);
      let x = MARGIN;
      row.forEach((cell, index) => {
        const pad = 8;
        const last = index === row.length - 1;
        if (last) {
          this.textRight(cell, x + widths[index] - pad, this.y - 8, { size: 9, bold: true, color: INK });
        } else {
          this.text(cell, x + pad, this.y - 8, { size: 9, color: INK });
        }
        x += widths[index];
      });
      this.y -= rowH;
    });
    this.y -= 12;
  }

  private drawCategoryTable() {
    this.sectionTitle('Spending by category');
    const total = this.report.currentMonth.expense || 1;
    const rows = this.report.currentMonth.byCategory.map((row) => [
      row.category,
      formatRs(row.amount),
      `${((row.amount / total) * 100).toFixed(1)}%`,
    ]);
    this.drawTable(['Category', 'Amount', 'Share of spend'], rows, [250, 160, 122]);
  }

  private drawIncomeDetails() {
    this.sectionTitle('Income details');
    const rows = this.report.incomes.map((row) => [
      row.date,
      row.source,
      row.incomeType,
      formatRs(row.amount),
    ]);
    this.drawTable(['Date', 'Source', 'Type', 'Amount'], rows, [90, 170, 120, 152]);
  }

  private drawExpenseDetails() {
    this.sectionTitle('Expense details');
    const rows = this.report.expenses.map((row) => [
      row.date,
      row.category,
      row.description.slice(0, 28),
      formatRs(row.amount),
    ]);
    this.drawTable(['Date', 'Category', 'Description', 'Amount'], rows, [90, 100, 190, 152]);
  }

  private drawBudgetTable() {
    this.sectionTitle('Budgets');
    const rows = this.report.budgets.map((budget) => [
      budget.category || 'Overall',
      formatRs(budget.spent),
      formatRs(budget.amount),
      `${budget.utilization}%`,
    ]);
    this.drawTable(['Budget', 'Spent', 'Limit', 'Utilization'], rows, [180, 120, 120, 112]);
  }

  private drawOutlook() {
    this.sectionTitle('Outlook');
    const boxW = (PAGE_W - MARGIN * 2 - 12) / 2;
    const boxH = 72;
    this.ensure(boxH + 8);
    const y = this.y - boxH;

    this.fillRect(MARGIN, y, boxW, boxH, SLATE);
    this.strokeRect(MARGIN, y, boxW, boxH, LINE);
    this.text('NEXT-MONTH FORECAST', MARGIN + 12, y + 50, { size: 8, bold: true, color: MUTED });
    if (this.report.prediction) {
      this.text(formatRs(this.report.prediction.predictedAmount), MARGIN + 12, y + 30, {
        size: 14,
        bold: true,
        color: PURPLE,
      });
      this.text(
        `${this.report.prediction.predictionPeriod}  ·  ${this.report.prediction.modelUsed}`,
        MARGIN + 12,
        y + 14,
        { size: 8, color: MUTED }
      );
    } else {
      this.text('No stored forecast yet.', MARGIN + 12, y + 28, { size: 10, color: MUTED });
      this.text('Train a model on the Predictions page.', MARGIN + 12, y + 14, { size: 8, color: MUTED });
    }

    const hx = MARGIN + boxW + 12;
    this.fillRect(hx, y, boxW, boxH, SLATE);
    this.strokeRect(hx, y, boxW, boxH, LINE);
    this.text('FINANCIAL HEALTH', hx + 12, y + 50, { size: 8, bold: true, color: MUTED });
    if (this.report.health) {
      const color = healthColor(this.report.health.status);
      this.text(`${this.report.health.overallScore} / 100`, hx + 12, y + 30, { size: 14, bold: true, color });
      this.text(this.report.health.status, hx + 12, y + 14, { size: 9, bold: true, color });
    } else {
      this.text('Health score is not available.', hx + 12, y + 28, { size: 10, color: MUTED });
    }
    this.y -= boxH + 16;
  }

  private drawGoals() {
    this.sectionTitle('Savings goals');
    const rows = this.report.goals.map((goal) => [
      goal.name,
      goal.status,
      formatRs(goal.remaining),
      `${formatRs(goal.requiredMonthly)} / mo`,
    ]);
    this.drawTable(['Goal', 'Status', 'Remaining', 'Required monthly'], rows, [180, 90, 130, 132]);
  }

  private drawSummary() {
    this.sectionTitle('Executive summary');
    const lines = wrapText(this.report.executiveSummary, 92);
    const boxH = 16 + lines.length * 13;
    this.ensure(boxH + 8);
    const y = this.y - boxH;
    this.fillRect(MARGIN, y, PAGE_W - MARGIN * 2, boxH, SLATE);
    this.strokeRect(MARGIN, y, PAGE_W - MARGIN * 2, boxH, LINE);
    lines.forEach((line, index) => {
      this.text(line, MARGIN + 10, this.y - 16 - index * 13, { size: 9, color: INK });
    });
    this.y -= boxH + 8;
  }

  private flushPage() {
    this.pageIndex += 1;
    this.fillRect(0, 0, PAGE_W, 28, NAVY);
    this.text('SmartFin AI  ·  Personal finance statement', MARGIN, 12, { size: 7, color: WHITE });
    this.textRight(`Page ${this.pageIndex}`, PAGE_W - MARGIN, 12, { size: 7, color: WHITE });
    this.pages.push(this.ops.join('\n'));
    this.ops = [];
    this.y = PAGE_H;
  }

  private toBuffer() {
    const objects: string[] = [];
    objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
    const pageCount = this.pages.length;
    const kids = this.pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ');
    objects.push(`2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pageCount} >> endobj\n`);
    objects.push('3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n');
    objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n');

    this.pages.forEach((stream, index) => {
      const pageObj = 5 + index * 2;
      const contentObj = 6 + index * 2;
      objects.push(
        `${pageObj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents ${contentObj} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >> endobj\n`
      );
      objects.push(
        `${contentObj} 0 obj << /Length ${Buffer.byteLength(stream, 'latin1')} >> stream\n${stream}\nendstream endobj\n`
      );
    });

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
}

export function buildPdfBuffer(report: PublicReport): Buffer {
  return new StatementPdf(report).build();
}
