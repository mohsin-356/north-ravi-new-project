import React from 'react';
import { X, Printer } from 'lucide-react';
import { IndoorSettings } from '../Indoor contexts/SettingsContext';

type Purchase = {
  _id: string;
  medicineName: string;
  supplierName: string;
  quantity: number;
  packQuantity: number;
  totalItems: number;
  buyPricePerPack: number;
  buyPricePerUnit?: number;
  salePricePerPack?: number;
  salePricePerUnit?: number | null;
  totalPurchaseAmount: number;
  invoiceNumber?: string;
  purchaseDate?: string;
  expiryDate?: string;
};

const IndoorPurchaseSlipModal: React.FC<{
  open: boolean;
  onClose: () => void;
  settings: IndoorSettings;
  purchase: Purchase | null;
  currency?: string;
}> = ({ open, onClose, settings, purchase, currency = 'PKR' }) => {
  if (!open || !purchase) return null;
  const fmt = (n: number) => Number(n || 0).toFixed(2);
  const when = purchase.purchaseDate ? new Date(purchase.purchaseDate) : new Date();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4">
      <div className="bg-white rounded-md w-full max-w-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Purchase Invoice {purchase.invoiceNumber || ''}</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded inline-flex items-center gap-2" onClick={()=>window.print()}><Printer className="h-4 w-4" /> Print</button>
            <button className="px-3 py-1 border rounded inline-flex items-center gap-2" onClick={onClose}><X className="h-4 w-4" /> Close</button>
          </div>
        </div>
        <div className="p-4 border rounded" id="print-area-purchase">
          <div className="text-center">
            {settings.logo && (<img src={settings.logo} alt="logo" className="mx-auto mb-2 max-h-16" />)}
            <div className="text-xl font-bold tracking-widest">{(settings.companyName || 'PHARMACY').toUpperCase()}</div>
            <div className="text-sm">{settings.companyAddress || ''}</div>
            {settings.companyPhone && <div className="text-sm">PHONE : {settings.companyPhone}</div>}
            {settings.companyEmail && <div className="text-sm">EMAIL : {settings.companyEmail}</div>}
          </div>
          <hr className="my-2" />
          <div className="text-center font-semibold">Purchase Bill</div>
          <div className="mt-2 text-sm space-y-0.5">
            <div>Date : {when.toLocaleDateString()}</div>
            <div>Supplier: {purchase.supplierName || '-'}</div>
            <div>Invoice #: {purchase.invoiceNumber || '-'}</div>
            {purchase.expiryDate && <div>Expiry: {new Date(purchase.expiryDate).toLocaleDateString()}</div>}
          </div>
          <hr className="my-2" />
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left">Medicine</th>
                <th className="text-center">Packs</th>
                <th className="text-center">Units</th>
                <th className="text-right">Buy</th>
                <th className="text-right">Units</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-1">{purchase.medicineName}</td>
                <td className="text-center">{Number(purchase.quantity || 0)}</td>
                <td className="text-center">{Number(purchase.packQuantity || 0)}</td>
                <td className="text-right">{fmt(purchase.buyPricePerPack || 0)}</td>
                <td className="text-right">{Number(purchase.totalItems || 0)}</td>
                <td className="text-right">{fmt(purchase.totalPurchaseAmount || 0)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 text-sm">
            <div className="flex items-center justify-between"><span>Total Amount</span><span>{fmt(purchase.totalPurchaseAmount || 0)}</span></div>
          </div>
          {settings.footerText && (<div className="mt-3 text-center text-sm">{settings.footerText}</div>)}
        </div>
      </div>
    </div>
  );
};

export default IndoorPurchaseSlipModal;
