import { toast } from 'sonner';

export type DocumentKind = 'offer_letter' | 'certificate' | 'lor';

/**
 * Fetches a fresh signed URL for a generated document and opens it in a
 * new tab (which the browser will render or download depending on its PDF
 * handling settings). Used by every "Download" button across the admin
 * and intern document screens so they all go through the same
 * authorization + signing path (see /api/documents/signed-url).
 */
export async function downloadDocument(kind: DocumentKind, id: string) {
  try {
    const res = await fetch('/api/documents/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Couldn't open that document");
      return;
    }
    window.open(data.url, '_blank', 'noopener,noreferrer');
  } catch (err: any) {
    toast.error(err.message ?? "Couldn't open that document");
  }
}
