import { useMemo } from 'react';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { POSItem } from '@/types/pos';

type Template = 'default' | 'minimal' | 'modern';

type BillingSlipProps = {
  items: POSItem[];
  subtotal: number;
  tax: number;
  total: number;
  invoiceNumber: string;
  date: Date;
  template?: Template;
};

export function BillingSlip({
  items,
  subtotal,
  tax,
  total,
  invoiceNumber,
  date,
  template = 'default'
}: BillingSlipProps) {
  const { settings } = useSettings();
  
  const getFooterLines = (text?: string, maxChars = 40): string[] => {
    if (!text) return [];
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
  
  const formattedDate = useMemo(() => {
    return date.toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, [date]);

  const getTemplateStyles = () => {
    switch(template) {
      case 'minimal':
        return {
          container: 'border-none p-0 bg-transparent',
          header: 'text-left mb-2',
          item: 'py-0'
        };
      case 'modern':
        return {
          container: 'border-none p-0 bg-gradient-to-b from-gray-50 to-white',
          header: 'text-center mb-6',
          item: 'py-2'
        };
      default:
        return {
          container: 'border rounded-lg p-4 max-w-md mx-auto bg-white',
          header: 'text-center mb-4',
          item: 'py-1'
        };
    }
  };

  const styles = getTemplateStyles();

  return (
    <div className={styles.container}>
      {/* Pharmacy Header */}
      <div className={styles.header}>
        {settings.logo && (
          <img
            src={settings.logo}
            alt="Pharmacy Logo"
            className="h-20 mx-auto mb-3 rounded border shadow-md"
            style={{ objectFit: 'contain', background: '#fff' }}
          />
        )}
        <h1 className="text-2xl font-extrabold tracking-wide text-primary uppercase">
          {settings.slipName || settings.companyName || 'Pharmacy'}
        </h1>
        {template !== 'minimal' && (
          <p className="text-sm text-muted-foreground">
            {settings.companyAddress || 'Address not configured'}
          </p>
        )}
        {template !== 'minimal' && (
          <p className="text-sm text-muted-foreground">
            {settings.companyPhone || 'Phone not configured'}
          </p>
        )}
      </div>

      {/* Invoice Info */}
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm font-medium">Invoice #: {invoiceNumber}</p>
          <p className="text-sm">Date: {formattedDate}</p>
        </div>
      </div>

      {/* Items */}
      <div className="border-t border-b py-2 mb-4">
        {items.map((item, index) => (
          <div key={index} className={`flex justify-between ${styles.item}`}>
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.quantity} x {item.price.toFixed(2)}
              </p>
            </div>
            <p>{(item.quantity * item.price).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <p>Subtotal:</p>
          <p>{subtotal.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p>Tax:</p>
          <p>{tax.toFixed(2)}</p>
        </div>
        <div className="flex justify-between font-bold border-t pt-2">
          <p>Total:</p>
          <p>{total.toFixed(2)}</p>
        </div>
      </div>

      {/* Footer */}
      {template !== 'minimal' && (
        <div className="mt-4 text-left text-xs text-muted-foreground">
          {settings.footerText
            ? (
              <div style={{ textAlign: 'left' }}>
                {getFooterLines(settings.footerText).map((ln, idx) => (
                  <div key={idx}>{ln}</div>
                ))}
              </div>
            )
            : (<p style={{ textAlign: 'center' }}>Thank you for your purchase!</p>)}
        </div>
      )}
    </div>
  );
}
