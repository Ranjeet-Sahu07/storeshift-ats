import jsPDF from 'jspdf';

export function generateLetterPdf(opts: {
  title: string;
  letterId: string;
  bodyLines: string[];
  signatoryName: string;
  signatoryTitle: string;
  issueDate: string;
}): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor('#0D2B2A');
  doc.text('StoreShift', 56, 64);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#5A6B6A');
  doc.text('Shift Your Store. Grow Your Business.', 56, 78);

  doc.setDrawColor('#28A745');
  doc.setLineWidth(1.2);
  doc.line(56, 92, W - 56, 92);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor('#0D2B2A');
  doc.text(opts.title, 56, 130);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#5A6B6A');
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
  doc.text(opts.signatoryName, 56, y + 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(opts.signatoryTitle, 56, y + 54);
  doc.text('StoreShift', 56, y + 66);

  return doc.output('blob');
}
