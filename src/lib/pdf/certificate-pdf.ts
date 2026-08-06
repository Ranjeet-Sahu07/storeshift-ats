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
const LIME = '#7BC043';
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

/** Filled 5-pointed star, used in the ribbon badge and the laurel emblem. */
function drawStar(doc: jsPDF, cx: number, cy: number, outerR: number, innerR: number, color: string) {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  doc.setFillColor(color);
  const lines = points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]);
  // @ts-ignore — jsPDF's TS types for lines() are stricter about tuple
  // shape than the runtime API actually requires.
  doc.lines(lines as any, points[0][0], points[0][1], [1, 1], 'F', true);
}

/** Dark triangular corner ornament with a thin gold edge, like the certificate's corners. */
function drawCornerTriangle(doc: jsPDF, corner: 'tl' | 'br', W: number, H: number) {
  const size = 108;
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

/** "EARLY STAGE STARTUP" ribbon badge, top right. */
function drawRibbon(doc: jsPDF, W: number) {
  const cx = W - 108;
  const topY = 8;
  const width = 86;
  const legsBottom = 118;

  // Solid ribbon body (full rect down to the tip of the legs)...
  doc.setFillColor(INK);
  doc.rect(cx - width / 2, topY, width, legsBottom - topY, 'F');
  // ...then cut a single upward-pointing white notch out of the bottom
  // center, which leaves two pointed "legs" behind — the standard
  // ribbon-badge tail shape.
  doc.setFillColor(255, 255, 255);
  doc.triangle(cx - 16, legsBottom, cx + 16, legsBottom, cx, legsBottom - 26, 'F');

  doc.setDrawColor(GOLD);
  doc.setLineWidth(1);
  doc.rect(cx - width / 2, topY, width, legsBottom - 26 - topY, 'S');

  // circular medallion with star
  doc.setFillColor(INK);
  doc.circle(cx, topY + 34, 26, 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.4);
  doc.circle(cx, topY + 34, 26, 'S');
  doc.circle(cx, topY + 34, 21, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EARLY', cx, topY + 27, { align: 'center' });
  doc.text('STAGE', cx, topY + 35, { align: 'center' });
  doc.text('STARTUP', cx, topY + 43, { align: 'center' });
  drawStar(doc, cx, topY + 55, 5, 2.2, GOLD);
}

/** Small circular icon badge used in the Duration/Project/Skills/Role row. */
function drawIconCircle(doc: jsPDF, cx: number, cy: number, kind: 'calendar' | 'folder' | 'code' | 'role') {
  const r = 13;
  doc.setFillColor(INK);
  doc.circle(cx, cy, r, 'F');
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.8);

  if (kind === 'calendar') {
    doc.roundedRect(cx - 6, cy - 5, 12, 10, 1, 1, 'S');
    doc.line(cx - 6, cy - 2, cx + 6, cy - 2);
    doc.line(cx - 3, cy - 7, cx - 3, cy - 4);
    doc.line(cx + 3, cy - 7, cx + 3, cy - 4);
  } else if (kind === 'folder') {
    doc.line(cx - 6, cy - 3, cx - 2, cy - 3);
    doc.line(cx - 2, cy - 3, cx - 1, cy - 5);
    doc.line(cx - 1, cy - 5, cx + 6, cy - 5);
    doc.rect(cx - 6, cy - 3, 12, 8, 'S');
  } else if (kind === 'code') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(GOLD);
    doc.text('</>', cx, cy + 3, { align: 'center' });
  } else {
    doc.circle(cx, cy - 2, 3, 'S');
    doc.setLineWidth(0.8);
    // @ts-ignore — see note above on jsPDF's lines() typing
    doc.lines([[6, 0], [-1, 5], [-4, 0], [-1, -5]] as any, cx - 3, cy + 3, [1, 1], 'S', true);
  }
}

/** Gold laurel branch — a row of small leaf ellipses curving up from the base. */
function drawLaurelBranch(doc: jsPDF, baseX: number, baseY: number, mirror: 1 | -1) {
  doc.setFillColor(GOLD);
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const t = i / (leaves - 1);
    const angle = -Math.PI / 2 + t * (Math.PI / 2.1);
    const radius = 30 + t * 4;
    const x = baseX + mirror * radius * Math.sin(angle) * 1.15;
    const y = baseY - radius * Math.cos(angle) * 0.95;
    doc.ellipse(x, y, 4.2, 2.1, 'F');
  }
}

/**
 * Generates a print-ready A4-landscape certificate PDF client-side and
 * returns it as a Blob — designed to closely match StoreShift's official
 * certificate template (gold double border, corner ornaments, "Early
 * Stage Startup" ribbon, laurel emblem, and detail row).
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');

  // Double gold border
  doc.setDrawColor(GOLD);
  doc.setLineWidth(2.2);
  doc.rect(20, 20, W - 40, H - 40);
  doc.setLineWidth(0.6);
  doc.rect(28, 28, W - 56, H - 56);

  drawCornerTriangle(doc, 'tl', W, H);
  drawCornerTriangle(doc, 'br', W, H);
  drawRibbon(doc, W);

  // Logo + wordmark
  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-mark.png');
    const logoH = 40;
    const logoW = logoH * (165 / 235);
    doc.addImage(logoDataUrl, 'PNG', W / 2 - logoW / 2 - 58, 40, logoW, logoH);
  } catch {
    // falls back to text-only header below
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(INK);
  doc.text('Store', W / 2 - 10, 66, { align: 'right' });
  doc.setTextColor(BRAND);
  doc.text('Shift', W / 2 - 10, 66, { align: 'left' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text('— Shift Your Store. Grow Your Business. —', W / 2, 80, { align: 'center' });

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(38);
  doc.setTextColor(INK);
  doc.text('CERTIFICATE', W / 2, 128, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(15);
  doc.setTextColor(GOLD_DARK);
  doc.text('❖   OF INTERNSHIP   ❖', W / 2, 148, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text('THIS IS TO CERTIFY THAT', W / 2, 174, { align: 'center' });

  // Name
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(27);
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

  // Detail row: Duration / Project / Key Skills / Role
  const detailY = H - 148;
  const cols = [
    { x: W * 0.16, kind: 'calendar' as const, label: 'DURATION', value: data.durationText },
    { x: W * 0.38, kind: 'folder' as const, label: 'PROJECT', value: data.projectName ?? 'StoreShift SaaS Platform' },
    { x: W * 0.60, kind: 'code' as const, label: 'KEY SKILLS', value: data.skills.slice(0, 3).join(', ') || '—' },
    { x: W * 0.82, kind: 'role' as const, label: 'ROLE', value: data.roleTitle },
  ];
  for (const col of cols) {
    drawIconCircle(doc, col.x, detailY, col.kind);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(INK);
    doc.text(col.label, col.x + 22, detailY - 3);
    doc.setDrawColor('#C9C9C9');
    doc.setLineWidth(0.6);
    doc.line(col.x + 22, detailY + 4, col.x + 100, detailY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    const trimmedValue = col.value.length > 24 ? col.value.slice(0, 22) + '…' : col.value;
    doc.text(trimmedValue, col.x + 22, detailY + 14);
  }

  // Signature (text-based approximation — no scanned signature asset supplied)
  const sigY = H - 78;
  doc.setFont('times', 'italic');
  doc.setFontSize(19);
  doc.setTextColor('#2B3A8F');
  doc.text('Ranjeet Kumar', 70, sigY - 10);
  doc.setDrawColor(INK);
  doc.setLineWidth(0.7);
  doc.line(64, sigY, 200, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(INK);
  doc.text('Ranjeet Kumar', 64, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text('Founder & CEO', 64, sigY + 25);
  doc.text('StoreShift', 64, sigY + 35);

  // Center laurel emblem
  const laurelCx = W / 2;
  const laurelCy = H - 92;
  drawLaurelBranch(doc, laurelCx, laurelCy, -1);
  drawLaurelBranch(doc, laurelCx, laurelCy, 1);
  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-mark.png');
    const emblemH = 30;
    const emblemW = emblemH * (165 / 235);
    doc.addImage(logoDataUrl, 'PNG', laurelCx - emblemW / 2, laurelCy - emblemH - 6, emblemW, emblemH);
  } catch {
    // no fallback needed — laurel branches still read as an emblem
  }
  drawStar(doc, laurelCx, laurelCy + 14, 5, 2.2, GOLD);

  // Certificate ID + Issue Date
  const metaX = W - 250;
  const metaY = H - 128;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text('CERTIFICATE ID', metaX, metaY);
  doc.setDrawColor('#C9C9C9');
  doc.line(metaX, metaY + 6, metaX + 130, metaY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(data.certificateId, metaX, metaY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text('ISSUE DATE', metaX, metaY + 36);
  doc.line(metaX, metaY + 42, metaX + 130, metaY + 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(data.issueDate, metaX, metaY + 52);

  // QR code
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin: 0, width: 300, color: { dark: INK, light: '#FFFFFF' } });
  const qrSize = 58;
  const qrX = W - 96;
  const qrY = H - 150;
  doc.setDrawColor(INK);
  doc.setLineWidth(0.8);
  doc.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 'S');
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
  doc.setFillColor(INK);
  doc.roundedRect(qrX - 8, qrY + qrSize + 10, qrSize + 16, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('SCAN TO VERIFY', qrX + qrSize / 2, qrY + qrSize + 20, { align: 'center' });

  // Bottom banner ribbon
  const bannerH = 26;
  doc.setFillColor(INK);
  doc.rect(0, H - bannerH, W, bannerH, 'F');
  doc.setFillColor(255, 255, 255);
  doc.triangle(0, H - bannerH, 16, H - bannerH, 0, H, 'F');
  doc.triangle(W, H - bannerH, W - 16, H - bannerH, W, H, 'F');

  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.6);
  doc.circle(W / 2 - 78, H - bannerH / 2, 6, 'S');
  doc.line(W / 2 - 84, H - bannerH / 2, W / 2 - 72, H - bannerH / 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('www.storeshift.in', W / 2 - 62, H - bannerH / 2 + 3.5, { align: 'left' });

  return doc.output('blob');
}
