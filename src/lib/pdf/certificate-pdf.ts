import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface CertificateData {
  certificateId: string;
  internName: string;
  roleTitle: string;
  department: string;
  durationText: string;
  skills: string[];
  issueDate: string;
  verificationUrl: string;
  projectName?: string;
}

const INK = '#0D2B2A';
const BRAND = '#28A745';
const GOLD = '#C9962E';
const GOLD_DARK = '#A87C22';
const MUTED = '#5A6B6A';

async function loadImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Truncates text to fit maxWidth using real glyph measurement, not a guessed char count. */
function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && doc.getTextWidth(trimmed + '…') > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + '…';
}

/** Small rotated-square "diamond" ornament — used instead of a unicode
 *  glyph, since jsPDF's built-in fonts don't reliably render ❖/◆ etc. */
function drawDiamond(doc: jsPDF, cx: number, cy: number, r: number, color: string) {
  doc.setFillColor(color);
  doc.lines(
    [[r, r], [-r, r], [-r, -r]] as any,
    cx - r, cy, [1, 1], 'F', true
  );
}

function drawStar(doc: jsPDF, cx: number, cy: number, outerR: number, innerR: number, color: string) {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  doc.setFillColor(color);
  const lines = points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]);
  // @ts-ignore — jsPDF's TS types for lines() are stricter about tuple shape than the runtime API requires
  doc.lines(lines as any, points[0][0], points[0][1], [1, 1], 'F', true);
}

function drawCornerTriangle(doc: jsPDF, corner: 'tl' | 'br', W: number, H: number) {
  const size = 100;
  doc.setFillColor(INK);
  if (corner === 'tl') {
    doc.triangle(18, 18, 18 + size, 18, 18, 18 + size, 'F');
    doc.setDrawColor(GOLD);
    doc.setLineWidth(1.2);
    doc.line(18 + size, 18, 18, 18 + size);
  } else {
    doc.triangle(W - 18, H - 18, W - 18 - size, H - 18, W - 18, H - 18 - size, 'F');
    doc.setDrawColor(GOLD);
    doc.setLineWidth(1.2);
    doc.line(W - 18 - size, H - 18, W - 18, H - 18 - size);
  }
}

/** "EARLY STAGE STARTUP" ribbon badge, top right — more compact proportions than v1. */
function drawRibbon(doc: jsPDF, W: number) {
  const cx = W - 96;
  const topY = 10;
  const width = 72;
  const legsBottom = 96;

  doc.setFillColor(INK);
  doc.rect(cx - width / 2, topY, width, legsBottom - topY, 'F');
  doc.setFillColor(255, 255, 255);
  doc.triangle(cx - 14, legsBottom, cx + 14, legsBottom, cx, legsBottom - 20, 'F');

  doc.setDrawColor(GOLD);
  doc.setLineWidth(1);
  doc.rect(cx - width / 2, topY, width, legsBottom - 20 - topY, 'S');

  doc.setFillColor(INK);
  doc.circle(cx, topY + 28, 22, 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.3);
  doc.circle(cx, topY + 28, 22, 'S');
  doc.circle(cx, topY + 28, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(255, 255, 255);
  doc.text('EARLY', cx, topY + 22, { align: 'center' });
  doc.text('STAGE', cx, topY + 29, { align: 'center' });
  doc.text('STARTUP', cx, topY + 36, { align: 'center' });
  drawStar(doc, cx, topY + 46, 4.2, 1.9, GOLD);
}

function drawIconCircle(doc: jsPDF, cx: number, cy: number, kind: 'calendar' | 'folder' | 'code' | 'role') {
  const r = 12;
  doc.setFillColor(INK);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.8);

  if (kind === 'calendar') {
    doc.roundedRect(cx - 5.5, cy - 4.5, 11, 9, 1, 1, 'S');
    doc.line(cx - 5.5, cy - 1.5, cx + 5.5, cy - 1.5);
    doc.line(cx - 2.5, cy - 6.5, cx - 2.5, cy - 3.5);
    doc.line(cx + 2.5, cy - 6.5, cx + 2.5, cy - 3.5);
  } else if (kind === 'folder') {
    doc.line(cx - 5.5, cy - 2.5, cx - 1.5, cy - 2.5);
    doc.line(cx - 1.5, cy - 2.5, cx - 0.5, cy - 4.5);
    doc.line(cx - 0.5, cy - 4.5, cx + 5.5, cy - 4.5);
    doc.rect(cx - 5.5, cy - 2.5, 11, 7, 'S');
  } else if (kind === 'code') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(GOLD);
    doc.text('</>', cx, cy + 2.6, { align: 'center' });
  } else {
    doc.circle(cx, cy - 2, 2.6, 'S');
    // @ts-ignore — see drawStar note on jsPDF's lines() typing
    doc.lines([[5.5, 0], [-1, 4.5], [-3.5, 0], [-1, -4.5]] as any, cx - 2.75, cy + 3, [1, 1], 'S', true);
  }
}

function drawLaurelBranch(doc: jsPDF, baseX: number, baseY: number, mirror: 1 | -1) {
  doc.setFillColor(GOLD);
  const leaves = 6;
  for (let i = 0; i < leaves; i++) {
    const t = i / (leaves - 1);
    const angle = -Math.PI / 2 + t * (Math.PI / 2.1);
    const radius = 24 + t * 3;
    const x = baseX + mirror * radius * Math.sin(angle) * 1.1;
    const y = baseY - radius * Math.cos(angle) * 0.9;
    doc.ellipse(x, y, 3.6, 1.8, 'F');
  }
}

/**
 * Generates a print-ready A4-landscape certificate PDF matching
 * StoreShift's official template: gold double border, corner ornaments,
 * "Early Stage Startup" ribbon, laurel emblem, and a detail row — laid
 * out so nothing overlaps regardless of how long the intern's name, role,
 * or duration text is.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Very subtle watermark of the mark, centered, for a premium printed feel
  try {
    const wmDataUrl = await loadImageAsDataUrl('/logo-mark.png');
    const wmH = 220;
    const wmW = wmH * (165 / 235);
    doc.setGState(new (doc as any).GState({ opacity: 0.035 }));
    doc.addImage(wmDataUrl, 'PNG', W / 2 - wmW / 2, H / 2 - wmH / 2 - 10, wmW, wmH);
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
  } catch {
    // watermark is decorative only — skip silently if it can't load
  }

  // Double gold border
  doc.setDrawColor(GOLD);
  doc.setLineWidth(2.2);
  doc.rect(20, 20, W - 40, H - 40);
  doc.setLineWidth(0.6);
  doc.rect(28, 28, W - 56, H - 56);

  drawCornerTriangle(doc, 'tl', W, H);
  drawCornerTriangle(doc, 'br', W, H);
  drawRibbon(doc, W);

  // --- Header: logo + wordmark, properly centered as one group so they
  // never overlap regardless of font metrics ---
  const headerY = 62;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  const storeWidth = doc.getTextWidth('Store');
  const shiftWidth = doc.getTextWidth('Shift');
  const logoH = 34;
  const logoW = logoH * (165 / 235);
  const gap = 10;
  const groupWidth = logoW + gap + storeWidth + shiftWidth;
  const groupStartX = W / 2 - groupWidth / 2;

  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-mark.png');
    doc.addImage(logoDataUrl, 'PNG', groupStartX, headerY - logoH + 8, logoW, logoH);
  } catch {
    // header text below still identifies the certificate even without the mark
  }
  doc.setTextColor(INK);
  doc.text('Store', groupStartX + logoW + gap, headerY);
  doc.setTextColor(BRAND);
  doc.text('Shift', groupStartX + logoW + gap + storeWidth, headerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text('— Shift Your Store. Grow Your Business. —', W / 2, headerY + 16, { align: 'center' });

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(INK);
  doc.text('CERTIFICATE', W / 2, 132, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(GOLD_DARK);
  const subtitle = 'OF INTERNSHIP';
  const subtitleWidth = doc.getTextWidth(subtitle);
  doc.text(subtitle, W / 2, 152, { align: 'center' });
  drawDiamond(doc, W / 2 - subtitleWidth / 2 - 16, 148, 3.5, GOLD);
  drawDiamond(doc, W / 2 + subtitleWidth / 2 + 16, 148, 3.5, GOLD);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text('THIS IS TO CERTIFY THAT', W / 2, 176, { align: 'center' });

  // Name
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.setTextColor(BRAND);
  doc.text(data.internName, W / 2, 208, { align: 'center' });
  const nameWidth = doc.getTextWidth(data.internName) + 40;
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.7);
  doc.line(W / 2 - nameWidth / 2, 216, W / 2 + nameWidth / 2, 216);

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(MUTED);
  const body = `has successfully completed the Internship Program as a ${data.roleTitle} at StoreShift.\nDuring this internship, the intern has shown dedication, consistency,\nand a strong willingness to learn and contribute.`;
  doc.text(body, W / 2, 236, { align: 'center', lineHeightFactor: 1.55 });

  // --- Detail row (Duration / Project / Skills / Role) — its own
  // vertical band, well clear of the signature/QR band below it ---
  const detailY = 340;
  const colWidth = W * 0.21;
  const cols = [
    { x: W * 0.15, kind: 'calendar' as const, label: 'DURATION', value: data.durationText },
    { x: W * 0.15 + colWidth, kind: 'folder' as const, label: 'PROJECT', value: data.projectName ?? 'StoreShift SaaS Platform' },
    { x: W * 0.15 + colWidth * 2, kind: 'code' as const, label: 'KEY SKILLS', value: data.skills.slice(0, 3).join(', ') || 'General' },
    { x: W * 0.15 + colWidth * 3, kind: 'role' as const, label: 'ROLE', value: data.roleTitle },
  ];
  for (const col of cols) {
    drawIconCircle(doc, col.x, detailY, col.kind);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(INK);
    doc.text(col.label, col.x + 20, detailY - 3);
    doc.setDrawColor('#C9C9C9');
    doc.setLineWidth(0.6);
    const lineEnd = col.x + Math.min(colWidth - 14, 150);
    doc.line(col.x + 20, detailY + 4, lineEnd, detailY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(fitText(doc, col.value, lineEnd - col.x - 20), col.x + 20, detailY + 14);
  }

  // --- Bottom band: signature (left), laurel emblem (center), cert ID +
  // QR (right) — all share the same vertical zone, clear of the row above ---
  const bandY = H - 150;

  // Signature
  const sigLineY = bandY + 78;
  doc.setFont('times', 'italic');
  doc.setFontSize(18);
  doc.setTextColor('#2B3A8F');
  doc.text('Ranjeet Kumar', 64, sigLineY - 10);
  doc.setDrawColor(INK);
  doc.setLineWidth(0.7);
  doc.line(60, sigLineY, 196, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text('Ranjeet Kumar', 60, sigLineY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text('Founder & CEO', 60, sigLineY + 25);
  doc.text('StoreShift', 60, sigLineY + 35);

  // Laurel emblem
  const laurelCx = W / 2;
  const laurelCy = bandY + 60;
  drawLaurelBranch(doc, laurelCx, laurelCy, -1);
  drawLaurelBranch(doc, laurelCx, laurelCy, 1);
  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-mark.png');
    const emblemH = 26;
    const emblemW = emblemH * (165 / 235);
    doc.addImage(logoDataUrl, 'PNG', laurelCx - emblemW / 2, laurelCy - emblemH - 4, emblemW, emblemH);
  } catch {
    // laurel branches alone still read as an emblem
  }
  drawStar(doc, laurelCx, laurelCy + 12, 4.2, 1.9, GOLD);

  // Certificate ID + Issue Date
  const metaX = W - 250;
  const metaY = bandY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text('CERTIFICATE ID', metaX, metaY);
  doc.setDrawColor('#C9C9C9');
  doc.line(metaX, metaY + 6, metaX + 118, metaY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(data.certificateId, metaX, metaY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text('ISSUE DATE', metaX, metaY + 40);
  doc.line(metaX, metaY + 46, metaX + 118, metaY + 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(data.issueDate, metaX, metaY + 56);

  // QR code
  const qrSize = 56;
  const qrX = W - 96;
  const qrY = bandY;
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin: 0, width: 300, color: { dark: INK, light: '#FFFFFF' } });
  doc.setDrawColor(INK);
  doc.setLineWidth(0.8);
  doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 'S');
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  doc.setFillColor(INK);
  doc.roundedRect(qrX - 8, qrY + qrSize + 10, qrSize + 16, 15, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(255, 255, 255);
  doc.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 19.5, { align: 'center' });

  // Bottom banner
  const bannerH = 24;
  doc.setFillColor(INK);
  doc.rect(0, H - bannerH, W, bannerH, 'F');
  doc.setFillColor(255, 255, 255);
  doc.triangle(0, H - bannerH, 15, H - bannerH, 0, H, 'F');
  doc.triangle(W, H - bannerH, W - 15, H - bannerH, W, H, 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.4);
  doc.circle(W / 2 - 72, H - bannerH / 2, 5.5, 'S');
  doc.line(W / 2 - 78, H - bannerH / 2, W / 2 - 66, H - bannerH / 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('www.storeshift.in', W / 2 - 58, H - bannerH / 2 + 3.2, { align: 'left' });

  return doc.output('blob');
}
