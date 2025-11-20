
export interface PrintConfig {
  printerName?: string;
  paperWidth: number; // in mm
  fontSize: number;
  lineSpacing: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  time: string;
  pharmacyName: string;
  pharmacyAddress: string;
  pharmacyPhone: string;
  customerName?: string;
  customerPhone?: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashier: string;
}

export class ThermalPrinter {
  private config: PrintConfig;

  constructor(config: Partial<PrintConfig> = {}) {
    this.config = {
      paperWidth: 80, // 80mm default
      fontSize: 12,
      lineSpacing: 1.2,
      margins: {
        top: 5,
        bottom: 5,
        left: 2,
        right: 2
      },
      ...config
    };
  }

  // Generate thermal receipt content
  generateReceiptContent(invoiceData: InvoiceData): string {
    const lines: string[] = [];
    const width = this.calculateLineWidth();

    // Header
    lines.push(this.centerText(invoiceData.pharmacyName, width));
    lines.push(this.centerText(invoiceData.pharmacyAddress, width));
    lines.push(this.centerText(`Tel: ${invoiceData.pharmacyPhone}`, width));
    lines.push(this.separator(width));
    
    // Invoice details
    lines.push(`Invoice: ${invoiceData.invoiceNumber}`);
    lines.push(`Date: ${invoiceData.date} ${invoiceData.time}`);
    lines.push(`Cashier: ${invoiceData.cashier}`);
    
    if (invoiceData.customerName) {
      lines.push(`Customer: ${invoiceData.customerName}`);
    }
    
    lines.push(this.separator(width));
    
    // Items header
    lines.push(this.formatLine('Item', 'Qty', 'Price', 'Total', width));
    lines.push(this.separator(width, '-'));
    
    // Items
    invoiceData.items.forEach(item => {
      // Item name (may wrap to multiple lines)
      const itemLines = this.wrapText(item.name, width - 20);
      lines.push(itemLines[0]);
      
      // Additional lines for long names
      for (let i = 1; i < itemLines.length; i++) {
        lines.push(itemLines[i]);
      }
      
      // Quantity, price, total
      const qtyPriceTotal = this.formatNumbers(
        item.quantity.toString(),
        `${item.price.toFixed(2)}`,
        `${item.total.toFixed(2)}`,
        width
      );
      lines.push(qtyPriceTotal);
    });
    
    lines.push(this.separator(width, '-'));
    
    // Totals
    lines.push(this.formatTotal('Subtotal:', invoiceData.subtotal, width));
    
    if (invoiceData.discount > 0) {
      lines.push(this.formatTotal('Discount:', -invoiceData.discount, width));
    }
    
    lines.push(this.formatTotal('Tax (17%):', invoiceData.tax, width));
    lines.push(this.separator(width, '='));
    lines.push(this.formatTotal('TOTAL:', invoiceData.total, width, true));
    lines.push(this.separator(width, '='));
    
    // Payment method
    lines.push(`Payment: ${invoiceData.paymentMethod}`);
    lines.push('');
    
    // Footer
    lines.push(this.centerText('Thank you for your business!', width));
    lines.push(this.centerText('Have a great day!', width));
    lines.push('');
    lines.push(this.centerText('Powered by Mindspire.org', width));
    
    return lines.join('\n');
  }

  // Print to thermal printer
  async printReceipt(invoiceData: InvoiceData): Promise<boolean> {
    try {
      const content = this.generateReceiptContent(invoiceData);
      
      // For web-based printing, we'll use the browser's print API
      // In a real Electron app, you would use node-thermal-printer or similar
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      
      const printContent = this.generatePrintHTML(content);
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      
      return true;
    } catch (error) {
      console.error('Printing failed:', error);
      return false;
    }
  }

  // Generate HTML for browser printing
  private generatePrintHTML(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @page {
            size: ${this.config.paperWidth}mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: ${this.config.fontSize}px;
            line-height: ${this.config.lineSpacing};
            margin: ${this.config.margins.top}mm ${this.config.margins.right}mm ${this.config.margins.bottom}mm ${this.config.margins.left}mm;
            white-space: pre-wrap;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `;
  }

  // Utility functions
  private calculateLineWidth(): number {
    // Approximate characters per line based on paper width and font size
    const charWidth = this.config.fontSize * 0.6; // Approximate
    const availableWidth = this.config.paperWidth - this.config.margins.left - this.config.margins.right;
    return Math.floor((availableWidth * 2.83) / charWidth); // Convert mm to points
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private separator(width: number, char: string = '='): string {
    return char.repeat(width);
  }

  private formatLine(col1: string, col2: string, col3: string, col4: string, width: number): string {
    const col1Width = Math.floor(width * 0.4);
    const col2Width = Math.floor(width * 0.15);
    const col3Width = Math.floor(width * 0.2);
    const col4Width = width - col1Width - col2Width - col3Width;

    return (
      col1.substring(0, col1Width).padEnd(col1Width) +
      col2.substring(0, col2Width).padStart(col2Width) +
      col3.substring(0, col3Width).padStart(col3Width) +
      col4.substring(0, col4Width).padStart(col4Width)
    );
  }

  private formatNumbers(qty: string, price: string, total: string, width: number): string {
    const spacing = Math.floor(width * 0.4);
    const numberSpacing = Math.floor((width - spacing) / 3);
    
    return (
      ' '.repeat(spacing) +
      qty.padStart(numberSpacing) +
      price.padStart(numberSpacing) +
      total.padStart(numberSpacing)
    );
  }

  private formatTotal(label: string, amount: number, width: number, bold: boolean = false): string {
    const amountStr = amount < 0 ? `-PKR ${Math.abs(amount).toFixed(2)}` : `PKR ${amount.toFixed(2)}`;
    const totalLine = label.padEnd(width - amountStr.length) + amountStr;
    return bold ? totalLine.toUpperCase() : totalLine;
  }

  private wrapText(text: string, maxWidth: number): string[] {
    if (text.length <= maxWidth) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

// Default printer configurations for common thermal printer sizes
export const PRINTER_CONFIGS = {
  thermal_58mm: {
    paperWidth: 58,
    fontSize: 10,
    lineSpacing: 1.1,
    margins: { top: 3, bottom: 3, left: 2, right: 2 }
  },
  thermal_80mm: {
    paperWidth: 80,
    fontSize: 12,
    lineSpacing: 1.2,
    margins: { top: 5, bottom: 5, left: 2, right: 2 }
  }
};

// Sample invoice data for testing
export const createSampleInvoice = (): InvoiceData => ({
  invoiceNumber: 'INV-001',
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString(),
  pharmacyName: 'PharmaCare Plus',
  pharmacyAddress: '123 Main Street, Lahore',
  pharmacyPhone: '+92-42-1234567',
  customerName: 'Ahmed Hassan',
  customerPhone: '+92-300-1234567',
  items: [
    { name: 'Panadol Extra', quantity: 2, price: 35.00, total: 70.00 },
    { name: 'Augmentin 625mg', quantity: 1, price: 450.00, total: 450.00 },
    { name: 'Brufen 400mg', quantity: 3, price: 60.00, total: 180.00 }
  ],
  subtotal: 700.00,
  discount: 35.00,
  tax: 119.00,
  total: 784.00,
  paymentMethod: 'Cash',
  cashier: 'Ali Khan'
});
