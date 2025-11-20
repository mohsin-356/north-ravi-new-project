import { printHtmlOverlay } from '@/utils/printOverlay';
export type SampleSlip = {
  sampleNumber?: number | string;
  dateTime?: string | Date;
  patientName?: string;
  guardianRelation?: string; // S/O, D/O, W/O
  guardianName?: string;
  cnic?: string;
  phone?: string;
  age?: string | number;
  gender?: string;
  address?: string;
  tests?: { name: string; price?: number }[];
  totalAmount?: number;
};

export function printSampleSlip(sample: SampleSlip, opts?: { title?: string }) {
  // Prefer Lab settings if present; fallback to Hospital settings and aggregated hospitalInfo
  const labSettings = safeJson(localStorage.getItem('labSettings')) || {};
  const labLogo = localStorage.getItem('labLogoUrl') || '';
  const storedInfo = safeJson(localStorage.getItem('hospitalInfo')) || {};
  const hospitalInfo = {
    name: labSettings.labName || localStorage.getItem('hospitalName') || storedInfo.name || 'Hospital Lab',
    address: labSettings.address || localStorage.getItem('hospitalAddress') || storedInfo.address || '',
    phone: labSettings.phone || localStorage.getItem('hospitalPhone') || storedInfo.phone || '',
    email: labSettings.email || storedInfo.email || localStorage.getItem('hospitalEmail') || '',
    website: labSettings.website || storedInfo.website || localStorage.getItem('hospitalWebsite') || '',
    logoUrl: labLogo || localStorage.getItem('hospitalLogo') || storedInfo.logoUrl || '',
  } as Record<string, string>;

  const title = opts?.title || `Sample_${sample?.sampleNumber ?? ''}`;
  const dt = sample?.dateTime ? new Date(sample.dateTime) : new Date();
  const styles = `
    <style>
      *{ box-sizing: border-box; }
      html, body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body{ font-family: Segoe UI, Arial, 'Helvetica Neue', system-ui, ui-sans-serif; margin: 10mm; color: #000; font-weight:600; -webkit-font-smoothing: none; text-rendering: optimizeSpeed; }
      .header{ display:block; text-align:center; border-bottom:1px dashed #000; padding-bottom:8px; margin-bottom:10px; }
      .h-left{ display:block; }
      .logo{ width:60px; height:60px; object-fit:contain; margin:0 auto 8px; }
      .title{ font-size:18px; font-weight:700; line-height:1.15; }
      .meta{ font-size:13px; color:#000; font-weight:600; }
      .meta-sm{ font-size:12px; color:#000; font-weight:600; }
      .row{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px; }
      .label{ color:#000; font-weight:600; }
      .value{ font-weight:700; color:#000; }
      .phone-number{ font-weight:800; }
      .big{ font-size:22px; font-weight:700; letter-spacing:0.5px; }
      .center{ text-align:center; }
      .footer{ border-top:1px dashed #000; margin-top:10px; padding-top:6px; font-size:12px; color:#000; font-weight:600; }
      .tests{ margin-top:8px; font-size:13px; }
      .tests .item{ display:flex; justify-content:space-between; padding:4px 0; font-weight:600; }
      .total{ display:flex; justify-content:space-between; font-weight:700; margin-top:6px; border-top:1px dashed #000; padding-top:6px; }
      @page{ size: 80mm auto; margin: 8mm; }
    </style>`;

  const testsHtml = (sample.tests || [])
    .map(t => `<div class="item"><span>${escapeHtml(t.name)}</span><span>${formatCurrency(Number(t.price||0))}</span></div>`) 
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${styles}</head>
    <body>
      <div class="header">
        <div class="h-left">
          ${hospitalInfo.logoUrl ? `<img class="logo" src="${escapeHtml(hospitalInfo.logoUrl)}" alt="logo"/>` : ''}
          <div>
            <div class="title">${escapeHtml(hospitalInfo.name || 'Hospital Lab')}</div>
            ${hospitalInfo.address ? `<div class="meta">${escapeHtml(hospitalInfo.address)}</div>` : ''}
            ${hospitalInfo.phone ? `
              <div class="meta-sm">
                <span class="phone-number">Ph: ${escapeHtml(hospitalInfo.phone)}</span>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="center">
          <div class="big">${escapeHtml(String(sample?.sampleNumber ?? ''))}</div>
          <div class="meta">${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}</div>
        </div>
      </div>

      <div class="row">
        <div><span class="label">Patient:</span> <span class="value">${escapeHtml(sample?.patientName || '')}</span></div>
        <div><span class="label">CNIC:</span> <span class="value">${escapeHtml(sample?.cnic || '')}</span></div>
        ${(sample?.guardianRelation || sample?.guardianName) ? `<div><span class="label">Guardian:</span> <span class="value">${escapeHtml(String(sample?.guardianRelation || ''))} ${escapeHtml(String(sample?.guardianName || ''))}</span></div>` : ''}
        <div><span class="label">Age/Gender:</span> <span class="value">${escapeHtml(String(sample?.age ?? ''))} / ${escapeHtml(String(sample?.gender || ''))}</span></div>
        <div><span class="label">Phone:</span> <span class="value phone-number"><strong>${escapeHtml(sample?.phone || '')}</strong></span></div>
        <div class="value" style="grid-column: span 2">${escapeHtml(sample?.address || '')}</div>
      </div>

      <div class="tests">
        ${testsHtml}
        <div class="total"><span>Total</span><span>${formatCurrency(Number(sample?.totalAmount||0))}</span></div>
      </div>

      <div class="footer center">
        Powered by Health Spire
      </div>
    </body></html>`;

  // Use unified overlay: Ctrl+P prints, Ctrl+D closes
  printHtmlOverlay(html, { title, width: 520, height: 740 });
}

function safeJson(s: string | null): any {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount: number): string {
  return `Rs. ${Number(amount||0).toLocaleString()}`;
}
