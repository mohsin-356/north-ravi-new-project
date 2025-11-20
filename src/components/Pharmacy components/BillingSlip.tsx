import React, { useRef } from 'react';
import '@/Pharmacy styles/billingSlip.css';
import { format } from 'date-fns';
import { Settings } from '@/Pharmacy contexts/PharmacySettingsContext';

// Matches the new design from the image
interface SaleItem {
  name: string;
  quantity: number;
  price: number; // Price per item
}

interface TaxDetail {
  name: string; // e.g., "CGST @ 14.00%"
  amount: number;
}

interface SaleDetails {
  items: SaleItem[];
  billNo: string;
  customerName: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  taxDetails: TaxDetail[];
  total: number;
  cashTendered: number;
}

interface BillingSlipProps {
  sale: SaleDetails;
  settings: Settings;
}

export const BillingSlip: React.FC<BillingSlipProps> = ({ sale, settings }) => {
  const slipRef = useRef<HTMLDivElement>(null);

  // Split footer text into multiple lines at word boundaries for nicer wrapping
  const getFooterLines = (text: string, maxChars = 28): string[] => {
    if (!text) return [];
    // Respect manual newlines first
    const parts = text.split(/\r?\n/);
    const lines: string[] = [];
    for (const part of parts) {
      const words = part.trim().split(/\s+/);
      let cur = '';
      for (const w of words) {
        if (!cur) { cur = w; continue; }
        if ((cur + ' ' + w).length <= maxChars) {
          cur += ' ' + w;
        } else {
          lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
    }
    return lines;
  };

  return (
    <div ref={slipRef} className="thermal-slip">
      {/* Inline critical CSS so print styling is always applied */}
      <style>{`
        /* Page and print optimizations */
        @media print { @page { size: 80mm auto; margin: 0; } }
        html,body { margin:0; padding:0; background:#fff; color:#000; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        html, body, * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: geometricPrecision; -webkit-text-size-adjust: 100%; }
        .thermal-slip { display:block; position:relative; }
        /* Use mm units for crisp thermal output (tighter width and more inner padding to avoid clipping) */
        .thermal-slip { width: 72mm; margin: 0 auto; font-family: Arial, Tahoma, sans-serif; font-size: 14px; line-height: 1.3; color:#000; padding: 0 4mm; page-break-inside: avoid; }
        /* Inline utility classes used in markup */
        .print-left{ text-align:left; }
        .print-right{ text-align:right; }
        .print-center{ text-align:center; }
        .print-bold{ font-weight:bold; }
        .print-small{ font-size:12px; }
        .print-table{ width:100%; border-collapse:collapse; table-layout:fixed; }
        .print-dashed{ border-top:1px dashed #000; }
        .print-double{ border-top:3px double #000; }
        .company-header { text-align:center; margin:0 0 3mm 0; }
        .company-logo { display:block; height:10mm; width:auto; object-fit:contain; margin: 1mm auto 1.5mm; }
        .company-name-bold { font-weight:800; font-size:26px; letter-spacing:0.4px; text-transform:uppercase; }
        .invoice-title { text-align:center; font-weight:bold; margin:2mm 0; text-decoration:underline; }
        .meta-info { font-size:11px; margin:2mm 0; }
        .items-table { width:100%; border-collapse:collapse; table-layout:fixed; }
        .items-table th { border-bottom:1px dashed #000; font-weight:bold; padding:1.25mm 0; }
        .items-table td { padding:1.25mm 0; }
        .col-item { width:50%; text-align:left; }
        .col-qty { width:15%; text-align:center; }
        .col-amt { width:35%; text-align:right; padding-right:2mm; }
        .subtotal-row td { border-top:1px solid #000; font-weight:bold; }
        .divider { border-top:1px dashed #000; margin:2mm 0; }
        .double-divider { border-top:3px double #000; margin:2mm 0; }
        .tax-row { font-size:12px; } 
        .total-row { display:flex; justify-content:space-between; font-size:13px; margin:1mm 0; }
        .grand-total { font-weight:bold; font-size:15px; }
        .footer-right { text-align:right; font-size:12px; margin-top:3mm; }
        .thank-you { text-align:center; font-size:12px; margin-top:2mm; font-weight:bold; }
        .footer-note { text-align:left; font-size:12px; margin-top:1.5mm; white-space:normal; word-break:break-word; }
        .footer-note-line { text-align:left; }
        /* Force footer note left alignment regardless of external styles */
        .footer-note, .footer-note * { text-align: left !important; }
      `}</style>
      <div className="divider print-dashed"></div>
      <div className="company-header print-center print-bold">
        {settings.logo && <img src={settings.logo} alt="logo" className="company-logo" />}
        <div className="company-name-bold print-bold print-center">{settings.companyName}</div>
        <div className="print-center">{settings.companyAddress}</div>
        {settings.companyPhone && <div className="print-center">PHONE : {settings.companyPhone}</div>}
        {settings.gstin && <div className="print-center">GSTIN : {settings.gstin}</div>}
      </div>
      <div className="divider print-dashed"></div>
      <div className="invoice-title print-center print-bold">Retail Invoice</div>

      <div className="meta-info print-small">
        <div>Date : {format(new Date(), 'dd/MM/yyyy, hh:mm a')}</div>
        <div className="print-bold">{sale.customerName}</div>
        <div>Bill No: <span className="print-bold">{sale.billNo}</span></div>
        <div>Payment Mode: <span className="print-bold">{sale.paymentMethod}</span></div>
              </div>

      <table className="items-table print-table">
        <thead>
          <tr>
            <th className="col-item print-bold print-left">Item</th>
            <th className="col-qty print-bold print-center">Qty</th>
            <th className="col-amt print-bold print-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <tr key={i}>
              <td className="col-item print-left">{item.name}</td>
              <td className="col-qty print-center">{item.quantity}</td>
              <td className="col-amt print-right">{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
          <tr className="subtotal-row print-bold">
            <td className="col-item print-left">Sub Total</td>
            <td className="col-qty print-center">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td className="col-amt print-right">{sale.subtotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div className="divider print-dashed"></div>

      <div className="totals-section">
        <div className="total-row">
          <span className="print-left">(-) Discount</span>
          <span className="print-right">{sale.discount.toFixed(2)}</span>
        </div>
        {sale.taxDetails.map((tax, i) => (
          <div key={i} className="total-row tax-row">
            <span className="print-left">{tax.name}</span>
            <span className="print-right">{tax.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="double-divider print-double"></div>
      <div className="total-row grand-total print-bold">
        <span className="print-left">TOTAL</span>
        <span className="print-right">Rs {sale.total.toFixed(2)}</span>
      </div>
      <div className="divider print-dashed"></div>

      <div className="thank-you">Thank you for your purchase!</div>
      {settings.footerText && (
        <div className="footer-note print-left print-small" style={{ textAlign: 'left' }}>
          {getFooterLines(settings.footerText).map((ln, idx) => (
            <div key={idx} className="footer-note-line">{ln}</div>
          ))}
        </div>
      )}
      <div className="divider print-dashed"></div>
    </div>
  );
};

export default BillingSlip;
