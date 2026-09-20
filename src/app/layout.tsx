import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Careers at StoreShift — Internship Program',
  description:
    'Join StoreShift as an intern. Build real SaaS products, work with a modern engineering team, and grow your career.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts are loaded via a plain <link> tag — deliberately NOT via
          next/font/google. next/font/google fetches the font files from
          Google during `next dev`/`next build` on whatever machine is
          running that command; if that machine's network can't reach
          fonts.googleapis.com (corporate proxy, restricted network,
          flaky DNS, etc.) the dev server hangs indefinitely at
          "✓ Starting..." and a production build fails outright. Loading
          the stylesheet this way instead makes it the *browser's*
          problem to fetch (which almost always has unrestricted internet
          access), and it degrades gracefully to the system-font fallback
          already defined in globals.css if it's ever unreachable there
          too — it never blocks the app from running.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- this rule targets the pages/ router; App Router's root layout is the correct place for a site-wide font link */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
