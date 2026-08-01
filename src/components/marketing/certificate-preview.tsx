import { QrCode, ShieldCheck } from 'lucide-react';

export function CertificatePreview() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <div className="rounded-2xl border-2 border-brand-600/20 bg-gradient-to-br from-white to-brand-50 p-6 shadow-glass sm:p-8">
            <div className="flex items-center justify-between border-b border-dashed border-brand-600/30 pb-4">
              <div>
                <p className="font-display text-lg font-bold text-ink-900">
                  Store<span className="text-brand-500">Shift</span>
                </p>
                <p className="text-[10px] text-ink-400">Shift Your Store. Grow Your Business.</p>
              </div>
              <span className="rounded-full bg-ink-900 px-3 py-1 text-[10px] font-semibold text-white">EARLY STAGE STARTUP</span>
            </div>
            <p className="mt-5 text-center font-display text-2xl font-bold tracking-wide text-ink-900">CERTIFICATE</p>
            <p className="text-center text-xs tracking-[0.3em] text-brand-600">OF INTERNSHIP</p>
            <p className="mt-5 text-center text-sm text-ink-500">This is to certify that</p>
            <p className="mt-1 text-center font-display text-2xl italic text-brand-700">Your Name Here</p>
            <p className="mt-3 text-center text-sm text-ink-500">
              has successfully completed the internship as a <strong>Frontend Intern</strong> at StoreShift.
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-dashed border-brand-600/30 pt-4">
              <div>
                <p className="text-[10px] text-ink-400">CERTIFICATE ID</p>
                <p className="font-mono text-xs font-semibold text-ink-900">SS-INT-2026-0001</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-ink-900 text-white">
                <QrCode size={28} />
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <span className="verified-chip">Certificate & Verification</span>
          <h2 className="mt-4 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
            A certificate that actually verifies.
          </h2>
          <p className="mt-4 text-ink-600">
            Every certificate ships with a unique ID and QR code linking to a public
            verification page — so anyone, from a recruiter to a college placement
            cell, can confirm it&apos;s real in seconds.
          </p>
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <ShieldCheck className="shrink-0 text-brand-600" size={22} />
            <p className="text-sm text-brand-800">
              Scan or search <span className="font-mono font-semibold">SS-INT-2026-0001</span> at{' '}
              <span className="font-semibold">storeshift.in/certificate/verify</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
