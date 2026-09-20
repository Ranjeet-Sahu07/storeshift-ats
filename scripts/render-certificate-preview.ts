import fs from 'node:fs';
import path from 'node:path';

// Mock fetch to serve files straight from /public, since the certificate
// generator uses relative asset paths (that's how it works in the browser
// bundle) — this lets us preview-render outside a browser.
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
(globalThis as any).fetch = async (url: string) => {
  const filePath = path.join(PUBLIC_DIR, url.replace(/^\//, ''));
  const buf = fs.readFileSync(filePath);
  return {
    blob: async () => new Blob([buf]),
  } as any;
};

// jsPDF in Node needs FileReader — provide a minimal shim since we only
// call readAsDataURL.
(globalThis as any).FileReader = class {
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;
  readAsDataURL(blob: any) {
    blob.arrayBuffer().then((ab: ArrayBuffer) => {
      const buf = Buffer.from(ab);
      this.result = `data:image/png;base64,${buf.toString('base64')}`;
      this.onloadend?.();
    });
  }
};

async function main() {
  const { generateCertificatePdf } = await import('../src/lib/pdf/certificate-pdf');
  const blob = await generateCertificatePdf({
    certificateId: 'SS-INT-2026-0042',
    internName: 'Priya Sharma',
    roleTitle: 'Frontend Development Intern',
    department: 'Engineering',
    durationText: '01 Jan 2026 – 30 Jun 2026',
    skills: ['React', 'TypeScript', 'Tailwind CSS'],
    issueDate: '30 Jun 2026',
    verificationUrl: 'https://careers.storeshift.in/certificate/verify?id=SS-INT-2026-0042',
    projectName: 'StoreShift SaaS Platform',
  });
  const ab = await blob.arrayBuffer();
  fs.writeFileSync('/tmp/preview-certificate.pdf', Buffer.from(ab));
  console.log('written', ab.byteLength, 'bytes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
