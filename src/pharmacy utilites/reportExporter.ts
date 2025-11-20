
interface ExportData {
  title: string;
  headers: string[];
  data: any[][];
  metadata?: {
    generatedBy?: string;
    generatedAt?: string;
    branch?: string;
    period?: string;
    totalSales?: string;
    totalMedicines?: string;
    totalCustomers?: string;
    lowStockItems?: string;
    [key: string]: string | undefined;
  };
}

class ReportExporter {
  exportToCSV(exportData: ExportData) {
    const { title, headers, data, metadata } = exportData;
    
    let csvContent = '';
    
    // Add title
    csvContent += `${title}\n\n`;
    
    // Add metadata if available
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        csvContent += `${key}: ${value}\n`;
      });
      csvContent += '\n';
    }
    
    // Add headers
    csvContent += headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(row => {
      csvContent += row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"` 
          : cell
      ).join(',') + '\n';
    });
    
    this.downloadFile(csvContent, `${title.replace(/\s+/g, '_')}.csv`, 'text/csv');
  }

  exportToExcel(exportData: ExportData) {
    // Simple Excel export using HTML table format
    const { title, headers, data, metadata } = exportData;
    
    let excelContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
            .metadata { margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="title">${title}</div>
    `;
    
    if (metadata) {
      excelContent += '<div class="metadata">';
      Object.entries(metadata).forEach(([key, value]) => {
        excelContent += `<div><strong>${key}:</strong> ${value}</div>`;
      });
      excelContent += '</div>';
    }
    
    excelContent += '<table><thead><tr>';
    headers.forEach(header => {
      excelContent += `<th>${header}</th>`;
    });
    excelContent += '</tr></thead><tbody>';
    
    data.forEach(row => {
      excelContent += '<tr>';
      row.forEach(cell => {
        excelContent += `<td>${cell}</td>`;
      });
      excelContent += '</tr>';
    });
    
    excelContent += '</tbody></table></body></html>';
    
    this.downloadFile(excelContent, `${title.replace(/\s+/g, '_')}.xls`, 'application/vnd.ms-excel');
  }



  exportToPDF(exportData: ExportData) {
    // Simple PDF export using print functionality
    const { title, headers, data, metadata } = exportData;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let pdfContent = `
      <html>
        <head>
          <title>${title}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: 'Poppins', Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .metadata { margin-bottom: 20px; }
            .metadata div { margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body class="bg-gray-100">
          <div class="header">
            <div class="title text-blue-500">${title}</div>
    `;
    
    if (metadata) {
      pdfContent += '<div class="metadata">';
      Object.entries(metadata).forEach(([key, value]) => {
        pdfContent += `<div class="text-gray-600"><strong class="text-gray-900">${key}:</strong> ${value}</div>`;
      });
      pdfContent += '</div>';
    }
    
    pdfContent += `
          </div>
          <table class="bg-white shadow-md rounded">
            <thead>
              <tr>
    `;
    
    headers.forEach(header => {
      pdfContent += `<th class="bg-blue-100 text-blue-500">${header}</th>`;
    });
    
    pdfContent += '</tr></thead><tbody>';
    
    data.forEach(row => {
      pdfContent += '<tr>';
      row.forEach(cell => {
        pdfContent += `<td class="border-b border-gray-200">${cell}</td>`;
      });
      pdfContent += '</tr>';
    });
    
    pdfContent += `
            </tbody>
          </table>
          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(pdfContent);
    printWindow.document.close();
  }

  private downloadFile(content: string, filename: string, contentType: string) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportSalesReport(sales: any[], dateRange: { from: string; to: string }) {
    const exportData: ExportData = {
      title: 'Sales Report',
      headers: ['Date', 'Invoice No', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total'],
      data: sales.map(sale => [
        new Date(sale.date).toLocaleDateString(),
        sale.invoiceNo,
        sale.customerName || 'Walk-in',
        sale.items.length,
        `PKR ${sale.subtotal.toFixed(2)}`,
        `PKR ${sale.tax.toFixed(2)}`,
        `PKR ${sale.total.toFixed(2)}`
      ]),
      metadata: {
        generatedBy: 'PharmaCare POS System',
        generatedAt: new Date().toLocaleString(),
        period: `${dateRange.from} to ${dateRange.to}`,
        totalSales: `PKR ${sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}`
      }
    };
    
    return exportData;
  }

  exportInventoryReport(medicines: any[]) {
    const now = new Date();
    const title = `Inventory_Report_${now.toISOString().split('T')[0]}`;
    const headers = [
      'ID',
      'Medicine Name',
      'Generic Name',
      'Category',
      'Manufacturer',
      'Batch No',
      'Expiry Date',
      'Quantity',
      'Purchase Price',
      'Sale Price',
      'Status'
    ];

    const data = medicines.map(medicine => [
      medicine.id,
      medicine.name,
      medicine.genericName || '-',
      medicine.category || '-',
      medicine.manufacturer || '-',
      medicine.batchNo || '-',
      medicine.expiryDate ? new Date(medicine.expiryDate).toLocaleDateString() : '-',
      medicine.quantity,
      `PKR ${medicine.purchasePrice}`,
      `PKR ${medicine.salePrice}`,
      medicine.quantity === 0 ? 'Out of Stock' : 
      medicine.quantity <= (medicine.minStock || 10) ? 'Low Stock' : 'In Stock'
    ]);

    const metadata = {
      'Generated By': 'PharmaCare POS System',
      'Generated At': now.toLocaleString(),
      'Total Medicines': medicines.length.toString(),
      'Out of Stock': medicines.filter(m => m.quantity === 0).length.toString(),
      'Low Stock': medicines.filter(m => m.quantity > 0 && m.quantity <= (m.minStock || 10)).length.toString()
    };

    return { title, headers, data, metadata };
  }

  exportCustomerReport(customers: any[]) {
    const exportData: ExportData = {
      title: 'Customer Report',
      headers: ['Name', 'Phone', 'Total Purchases', 'Last Purchase'],
      data: customers.map(customer => [
        customer.name,
        customer.phone,
        customer.totalPurchases || 0,
        customer.lastPurchase || 'N/A'
      ]),
      metadata: {
        generatedBy: 'PharmaCare POS System',
        generatedAt: new Date().toLocaleString(),
        totalCustomers: customers.length.toString()
      }
    };
    
    return exportData;
  }
}

export const reportExporter = new ReportExporter();
