import jsPDF from 'jspdf';

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

/**
 * Generates a letterhead-style PDF (offer letters, letters of
 * recommendation) with the real StoreShift logo and a consistent brand
 * footer. Async because it fetches the logo asset — await this at the
 * call site.
 */
export async function generateLetterPdf(opts: {
  title: string;
  letterId: string;
  bodyLines: string[];
  signatoryName: string;
  signatoryTitle: string;
  issueDate: string;
}): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const INK = '#0D2B2A';
  const BRAND = '#28A745';
  const MUTED = '#5A6B6A';

  // Letterhead
  try {
    const logoDataUrl = await loadImageAsDataUrl('/logo-mark.png');
    const logoH = 30;
    const logoW = logoH * (165 / 235);
    doc.addImage(logoDataUrl, 'PNG', 56, 40, logoW, logoH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(INK);
    doc.text('Store', 56 + logoW + 8, 58);
    doc.setTextColor(BRAND);
    doc.text('Shift', 56 + logoW + 8 + doc.getTextWidth('Store'), 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text('Shift Your Store. Grow Your Business.', 56 + logoW + 8, 70);
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(INK);
    doc.text('StoreShift', 56, 64);
  }

  doc.setDrawColor(BRAND);
  doc.setLineWidth(1.2);
  doc.line(56, 92, W - 56, 92);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(INK);
  doc.text(opts.title, 56, 130);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(`Reference: ${opts.letterId}    Date: ${opts.issueDate}`, 56, 148);

  doc.setFontSize(11);
  doc.setTextColor('#1A2E2D');
  let y = 180;
  for (const line of opts.bodyLines) {
    const wrapped = doc.splitTextToSize(line, W - 112);
    doc.text(wrapped, 56, y);
    y += wrapped.length * 16 + 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(opts.signatoryName, 56, y + 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(opts.signatoryTitle, 56, y + 54);
  doc.text('StoreShift', 56, y + 66);

  // Footer
  doc.setDrawColor('#E5E5E5');
  doc.setLineWidth(0.5);
  doc.line(56, H - 56, W - 56, H - 56);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text('www.storeshift.in', 56, H - 40);
  doc.text(`Document ID: ${opts.letterId}`, W - 56, H - 40, { align: 'right' });

  return doc.output('blob');
}
