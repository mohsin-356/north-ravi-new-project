import React from 'react';
import { X, Printer } from 'lucide-react';
import { IndoorSettings } from '../Indoor contexts/SettingsContext';

type Line = { name: string; qty: number; amt: number };

const ReceiptModal: React.FC<{
  open: boolean;
  onClose: () => void;
  settings: IndoorSettings;
  billNo: string;
  date: Date;
  customer: string;
  payment: string;
  lines: Line[];
  subtotal: number;
  discount: number;
  taxRate: number; // 0.17 for 17%
  currency: string;
}> = ({ open, onClose, settings, billNo, date, customer, payment, lines, subtotal, discount, taxRate, currency }) => {
  if (!open) return null;
  const tax = (subtotal - discount) * taxRate;
  const total = Math.max(0, subtotal - discount + tax);
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  const printNow = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4">
      <div className="bg-white rounded-md w-full max-w-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Receipt {billNo}</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded inline-flex items-center gap-2" onClick={printNow}><Printer className="h-4 w-4" /> Print (Ctrl+P)</button>
            <button className="px-3 py-1 border rounded inline-flex items-center gap-2" onClick={onClose}><X className="h-4 w-4" /> Close (Ctrl+D)</button>
          </div>
        </div>
        <div className="p-4 border rounded" id="print-area">
          <div className="text-center">
            {settings.logo && (
              <img src={settings.logo} alt="logo" className="mx-auto mb-2 max-h-16" />
            )}
            <div className="text-xl font-bold tracking-widest">{(settings.companyName || 'PHARMACY').toUpperCase()}</div>
            <div className="text-sm">{settings.companyAddress}</div>
            {settings.companyPhone && <div className="text-sm">PHONE : {settings.companyPhone}</div>}
            {settings.companyEmail && <div className="text-sm">EMAIL : {settings.companyEmail}</div>}
          </div>
          <hr className="my-2" />
          <div className="text-center font-semibold">Retail Invoice</div>
          <div className="mt-2 text-sm space-y-0.5">
            <div>Date : {date.toLocaleDateString()} , {date.toLocaleTimeString()}</div>
            <div>{customer}</div>
            <div>Bill No: {billNo}</div>
            <div>Payment Mode: {payment}</div>
          </div>
          <hr className="my-2" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Item</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Amt</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-1">{l.name}</td>
                  <td className="text-center">{l.qty}</td>
                  <td className="text-right">{l.amt.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm">
            <div className="flex items-center justify-between"><span>Sub Total</span><span>{fmt(subtotal)}</span></div>
            <div className="flex items-center justify-between"><span>(-) Discount</span><span>{fmt(discount)}</span></div>
            <div className="flex items-center justify-between"><span>GST ({Math.round(taxRate*100)}%)</span><span>{fmt(tax)}</span></div>
            <hr className="my-2" />
            <div className="flex items-center justify-between font-semibold"><span>TOTAL</span><span>{fmt(total)}</span></div>
          </div>
          {settings.footerText && (
            <div className="mt-3 text-center text-sm">{settings.footerText}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
