// Mindspire POS Secure License Key Generator with Customer Info, Purchase Date, and Digital Signature
// Usage: node keygen_signed.js <customer_name> <purchase_date>
// Copyright (c) Mindspire.org

const fs = require('fs');
const crypto = require('crypto');

// Replace with your own secure secret key (keep private!)
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

if (process.argv.length < 4) {
  console.log('Usage: node keygen_signed.js <customer_name> <purchase_date (YYYY-MM-DD)>');
  process.exit(1);
}

const customer = process.argv[2];
const purchaseDate = process.argv[3];
const key = generateKey(customer, purchaseDate);

console.log('Generated License Key:');
console.log(key);
fs.writeFileSync('license_key_signed.txt', key + '\n');
console.log('\nSaved to license_key_signed.txt');
