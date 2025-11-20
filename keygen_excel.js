// Mindspire POS License Key Generator with Excel Export
// Usage: node keygen_excel.js <number_of_keys>
// Copyright (c) Mindspire.org

const fs = require('fs');
const XLSX = require('xlsx');

function generateKey() {
  return 'mindspire-' + Math.floor(100000000 + Math.random() * 900000000);
}

function generateKeys(count) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push({
      key: generateKey(),
      user: '', // Fill after sale
      purchase_date: '' // Fill after sale
    });
  }
  return keys;
}

const num = parseInt(process.argv[2], 10) || 1;
const records = generateKeys(num);

// Write to Excel file
const ws = XLSX.utils.json_to_sheet(records);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Keys');
XLSX.writeFile(wb, 'license_keys.xlsx');

console.log(`Generated ${num} license keys. Saved to license_keys.xlsx.`);
