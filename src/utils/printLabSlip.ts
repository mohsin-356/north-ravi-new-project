export type LabTest = { name: string; amount: number };

export type LabSlipData = {
  tokenNumber: string;
  dateTime?: string | Date;
  userName?: string;
  doctor?: string;
  patientName: string;
  phone?: string;
  age?: string | number;
  gender?: string;
  tests: LabTest[];
  discount?: number;
};

export function printLabTokenSlip(data: LabSlipData) {
  const storedInfo = safeJson(localStorage.getItem('hospitalInfo')) || {};
  const labSettings = safeJson(localStorage.getItem('labSettings')) || {};
  const hospitalInfo = {
    name: labSettings.labName || localStorage.getItem('hospitalName') || storedInfo.name || 'Hospital',
    address: labSettings.address || localStorage.getItem('hospitalAddress') || storedInfo.address || '',
    phone: labSettings.phone || localStorage.getItem('hospitalPhone') || storedInfo.phone || '',
    logoUrl: localStorage.getItem('hospitalLogo') || storedInfo.logoUrl || localStorage.getItem('hospitalLogoUrl') || localStorage.getItem('labLogoUrl') || labSettings.logoUrl || '',
  } as Record<string, string>;
  const diagUser = safeJson(localStorage.getItem('diagnosticsUser')) || {};
  const storedUser = safeJson(localStorage.getItem('user')) || {};
  const userName = data.userName || diagUser?.username || storedUser?.username || storedUser?.name || localStorage.getItem('username') || '';
  const dt = data.dateTime ? new Date(data.dateTime) : new Date();
  const discount = Number(data.discount || 0);
  const total = Number(data.tests?.reduce((s, t) => s + Number(t.amount || 0), 0) || 0);
  const payable = Math.max(0, total - discount);

  const styles = `
    <style>
      *{ box-sizing: border-box; }
      html, body{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body{ font-family: Segoe UI, Arial, 'Helvetica Neue', system-ui, ui-sans-serif; margin: 0; color: #000; font-weight:600; }
      .wrap{ width:72mm; margin:0 auto; padding:6mm 4mm; }
      .header{ text-align:center; border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:8px; }
      .logo{ width:34px; height:34px; object-fit:contain; margin:0 auto 4px; }
      .title{ font-size:20px; font-weight:800; line-height:1.2; text-transform:capitalize; }
      .meta{ font-size:12px; }
      .line{ border-top:1px dashed #000; margin:6px 0; }
      .row{ display:flex; align-items:center; justify-content:space-between; font-size:12px; }
      .label{ font-weight:600; color:#000; }
      .value{ font-weight:700; color:#000; }
      .field{ display:flex; justify-content:space-between; font-size:13px; padding:2px 0; }
      .token-box{ border:2px solid #000; padding:6px; text-align:center; font-size:18px; font-weight:800; margin:6px 0; }
      table{ width:100%; border-collapse:collapse; }
      th, td{ font-size:12px; padding:4px 0; }
      thead th{ border-bottom:1px dashed #000; text-align:left; }
      th.charges, td.charges{ text-align:right; }
      .totals{ margin-top:6px; font-size:13px; }
      .totals .row{ padding:2px 0; }
      .grand{ font-size:15px; font-weight:800; }
      .footer{ border-top:1px dashed #000; margin-top:8px; padding-top:6px; font-size:11px; text-align:center; }
      @page{ size:80mm auto; margin: 0; }
    </style>`;

  const testsRows = (data.tests || []).map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(t.name)}</td>
      <td class="charges">${Number(t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Lab_${escapeHtml(data.tokenNumber || '')}</title>${styles}</head>
    <body>
      <div class="wrap">
        <div class="header">
          ${hospitalInfo.logoUrl ? `<img class="logo" src="${escapeHtml(hospitalInfo.logoUrl)}" alt="logo"/>` : ''}
          <div class="title">${escapeHtml(hospitalInfo.name || 'Hospital')}</div>
          ${hospitalInfo.address ? `<div class="meta">${escapeHtml(hospitalInfo.address)}</div>` : ''}
          ${hospitalInfo.phone ? `<div class="meta">Mobile #: ${escapeHtml(hospitalInfo.phone)}</div>` : ''}
          <div class="line"></div>
          <div class="title" style="font-size:16px; text-decoration:underline;">Lab Investigation Token</div>
          <div class="row" style="margin-top:4px;">
            <div>User: ${escapeHtml(userName || '')}</div>
            <div>${dt.toLocaleDateString('en-GB')} ${dt.toLocaleTimeString()}</div>
          </div>
        </div>

        <div class="field"><span class="label">Doctor Name:</span><span class="value">${escapeHtml(data.doctor || '')}</span></div>
        <div class="field"><span class="label">Patient Name:</span><span class="value">${escapeHtml(data.patientName || '')}</span></div>
        <div class="field"><span class="label">Mobile #:</span><span class="value">${escapeHtml(data.phone || '')}</span></div>
        <div class="field"><span class="label">Age:</span><span class="value">${escapeHtml(String(data.age ?? ''))}</span></div>
        <div class="field"><span class="label">Sex:</span><span class="value">${escapeHtml(String(data.gender || ''))}</span></div>

        <div class="token-box">${escapeHtml(data.tokenNumber || '')}</div>

        <table>
          <thead>
            <tr>
              <th style="width:10%">Sr</th>
              <th style="width:60%">Test Name</th>
              <th class="charges" style="width:30%">Charges</th>
            </tr>
          </thead>
          <tbody>
            ${testsRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="row"><span>Total Amount:</span><span> ${total.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
          <div class="row"><span>Discount:</span><span> ${discount.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
          <div class="row grand"><span>Payable Amount:</span><span> ${payable.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</span></div>
        </div>

        <div class="footer">Powered by Hospital MIS</div>
      </div>
    </body></html>`;

  const overlayId = 'lab-token-print-overlay';
  const existing = document.getElementById(overlayId);
  if (existing) { try { existing.remove(); } catch {} }

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(15,23,42,0.35)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'grid';
  overlay.style.placeItems = 'center';

  const box = document.createElement('div');
  box.style.width = '520px';
  box.style.maxWidth = '96vw';
  box.style.height = '740px';
  box.style.maxHeight = '92vh';
  box.style.background = '#ffffff';
  box.style.border = '1px solid #cbd5e1';
  box.style.borderRadius = '10px';
  box.style.boxShadow = '0 20px 50px rgba(2,6,23,0.35)';
  box.style.display = 'grid';
  box.style.gridTemplateRows = 'auto 1fr';

  const bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.justifyContent = 'space-between';
  bar.style.padding = '10px 12px';
  bar.style.borderBottom = '1px solid #e2e8f0';
  bar.style.background = '#f8fafc';
  bar.innerHTML = `<div style="font-weight:700;color:#0f172a">Lab Slip Preview</div>
    <div>
      <button id="tp-btn-print" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;">Print (Ctrl+P)</button>
      <button id="tp-btn-close" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;margin-left:8px;">Close (Ctrl+D)</button>
    </div>`;

  const frame = document.createElement('iframe');
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';

  box.appendChild(bar);
  box.appendChild(frame);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const writeFrame = () => {
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();
    } catch {}
  };
  if ((frame as any).srcdoc !== undefined) {
    try { (frame as any).srcdoc = html; } catch { writeFrame(); }
  } else {
    writeFrame();
  }
  frame.addEventListener('load', () => { try { frame.contentWindow?.focus(); } catch {} });

  const onPrint = (e?: Event) => { try { e?.preventDefault?.(); frame.contentWindow?.focus(); frame.contentWindow?.print(); } catch {} };
  const onClose = (e?: Event) => {
    try { e?.preventDefault?.(); } catch {}
    try { document.removeEventListener('keydown', onKey, true); } catch {}
    try { overlay.remove(); } catch {}
  };
  const onKey = (e: KeyboardEvent) => {
    const k = (e.key || '').toLowerCase();
    if (e.ctrlKey && k === 'p') { e.preventDefault(); onPrint(e); }
    if (e.ctrlKey && k === 'd') { e.preventDefault(); onClose(e); }
  };
  document.addEventListener('keydown', onKey, true);
  (bar.querySelector('#tp-btn-print') as HTMLButtonElement)?.addEventListener('click', onPrint);
  (bar.querySelector('#tp-btn-close') as HTMLButtonElement)?.addEventListener('click', onClose);
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
