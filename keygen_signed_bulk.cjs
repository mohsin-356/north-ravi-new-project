// Mindspire POS Bulk Secure License Key Generator
// Usage: node keygen_signed_bulk.cjs <count> <base_customer_name> <purchase_date>
// Copyright (c) Mindspire.org

const fs = require('fs');
const crypto = require('crypto');

const SIGN_SECRET = 'mindspire-2025-secure-secret';

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function signData(data) {
  return crypto.createHmac('sha256', SIGN_SECRET).update(data).digest('hex').slice(0, 16);
}

function generateKey(customer, date) {
  const payload = JSON.stringify({ customer, date });
  const encoded = base64url(payload);
  const signature = signData(encoded);
  return `mindspire-${encoded}-${signature}`;
}

if (process.argv.length < 5) {
  console.log('Usage: node keygen_signed_bulk.cjs <count> <base_customer_name> <purchase_date (YYYY-MM-DD)>');
  process.exit(1);
}

const count = parseInt(process.argv[2], 10);
const baseCustomer = process.argv[3];
const purchaseDate = process.argv[4];

const keys = [];
for (let i = 1; i <= count; i++) {
  const customer = `${baseCustomer} ${i}`;
  keys.push(generateKey(customer, purchaseDate));
}

console.log('Generated License Keys:');
keys.forEach(k => console.log(k));
fs.writeFileSync('license_keys_bulk.txt', keys.join('\n') + '\n');
console.log('\nSaved to license_keys_bulk.txt');
