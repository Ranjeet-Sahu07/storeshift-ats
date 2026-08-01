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
}

/**
 * Generates a print-ready A4-landscape certificate PDF client-side and
 * returns it as a Blob, ready to upload to Supabase Storage or trigger
 * a browser download.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const ink = '#0D2B2A';
  const brand = '#28A745';

  // Border
  doc.setDrawColor(brand);
  doc.setLineWidth(3);
  doc.rect(24, 24, W - 48, H - 48);
  doc.setLineWidth(0.75);
  doc.rect(32, 32, W - 64, H - 64);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(ink);
  doc.text('StoreShift', W / 2, 90, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#5A6B6A');
  doc.text('Shift Your Store. Grow Your Business.', W / 2, 108, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.setTextColor(ink);
  doc.text('CERTIFICATE OF INTERNSHIP', W / 2, 160, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#5A6B6A');
  doc.text('This is to certify that', W / 2, 195, { align: 'center' });

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(brand);
  doc.text(data.internName, W / 2, 230, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#5A6B6A');
  const body = `has successfully completed the Internship Program as a ${data.roleTitle} in the\n${data.department} department at StoreShift, demonstrating dedication, consistency,\nand a strong willingness to learn and contribute.`;
  doc.text(body, W / 2, 260, { align: 'center', lineHeightFactor: 1.6 });

  // Footer details
  const footerY = H - 100;
  doc.setFontSize(9);
  doc.setTextColor(ink);
  doc.text(`DURATION\n${data.durationText}`, 80, footerY);
  doc.text(`SKILLS\n${data.skills.slice(0, 4).join(', ')}`, 260, footerY);
  doc.text(`ISSUE DATE\n${data.issueDate}`, 480, footerY);
  doc.text(`CERTIFICATE ID\n${data.certificateId}`, 620, footerY);

  // QR Code
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin: 1, width: 200 });
  doc.addImage(qrDataUrl, 'PNG', W - 130, H - 140, 70, 70);
  doc.setFontSize(7);
  doc.text('SCAN TO VERIFY', W - 130, H - 60);

  // Signature line
  doc.setDrawColor(ink);
  doc.line(80, H - 130, 220, H - 130);
  doc.setFontSize(9);
  doc.text('Founder & CEO, StoreShift', 80, H - 118);

  return doc.output('blob');
}
