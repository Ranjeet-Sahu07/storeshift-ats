const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://careers.storeshift.in';

/**
 * Wraps any inner HTML in StoreShift's branded email shell — dark header
 * with the logo, white content card, brand-green button styling. This
 * chrome is intentionally NOT admin-editable (it's just visual framing);
 * the actual message text always comes from the `email_templates` table
 * (see `renderStoredTemplate` below) so admins can edit wording without
 * touching code.
 */
export function brandedEmailShell(innerHtml: string): string {
  return `
  <div style="background:#F4F6F8;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;">
      <div style="background:#0D2B2A;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
        <img src="${SITE_URL}/logo-mark.png" alt="StoreShift" width="40" height="40" style="display:inline-block;vertical-align:middle;" />
        <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:20px;font-weight:700;color:#ffffff;">
          Store<span style="color:#28A745;">Shift</span>
        </span>
      </div>
      <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        ${innerHtml}
      </div>
      <p style="text-align:center;color:#9AA5A4;font-size:12px;margin-top:20px;">
        StoreShift · <a href="https://storeshift.in" style="color:#28A745;text-decoration:none;">storeshift.in</a>
      </p>
    </div>
  </div>`;
}

export function emailButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#28A745;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;margin-top:8px;">${label}</a>`;
}

export function credentialTable(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 0;color:#5A6B6A;font-size:13px;">${label}</td>
        <td style="padding:8px 0;color:#0D2B2A;font-size:13px;font-weight:600;font-family:monospace;text-align:right;">${value}</td>
      </tr>`
    )
    .join('');
  return `<table style="width:100%;border-top:1px dashed #E5E5E5;border-bottom:1px dashed #E5E5E5;margin:20px 0;">${trs}</table>`;
}

export function eyebrow(text: string): string {
  return `<p style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:#28A745;text-transform:uppercase;margin:0 0 8px;">${text}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="font-size:22px;color:#0D2B2A;margin:0 0 16px;">${text}</h1>`;
}

/** Renders a free-form admin message (from the "Message this intern" composer) into paragraphs. */
export function renderMessageParagraphs(message: string): string {
  return message
    .split(/\n{2,}/)
    .map((p) => `<p style="color:#1A2E2D;font-size:14px;line-height:1.6;margin:0 0 12px;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
