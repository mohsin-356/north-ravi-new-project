export function printHtmlOverlay(html: string, options?: {
  title?: string;
  width?: number; // px
  height?: number; // px
  autoPrint?: boolean; // if true, trigger print automatically after load
}) {
  const overlayId = 'token-print-overlay';
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
  const w = options?.width ?? 520;
  const h = options?.height ?? 740;
  box.style.width = `${w}px`;
  box.style.maxWidth = '96vw';
  box.style.height = `${h}px`;
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
  bar.innerHTML = `<div style="font-weight:700;color:#0f172a">${(options?.title || 'Print Preview')}</div>
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
      injectContrastStyles();
    } catch {}
  };
  if ((frame as any).srcdoc !== undefined) {
    try { (frame as any).srcdoc = html; injectContrastStyles(); } catch { writeFrame(); }
  } else {
    writeFrame();
  }
  frame.addEventListener('load', () => {
    try { injectContrastStyles(); frame.contentWindow?.focus(); } catch {}
    try {
      if (options?.autoPrint) {
        setTimeout(() => { onPrint(); }, 30);
      }
    } catch {}
  });

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

  function injectContrastStyles(){
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const style = doc.createElement('style');
      style.textContent = `
        html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body, body * { color: #000 !important; font-weight: 700 !important; text-shadow: none !important; }
        @page { margin: 8mm; }
      `;
      doc.head?.appendChild(style);
    } catch {}
  }
}
