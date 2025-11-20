// Mindspire POS License Key Generator
// Usage: node keygen.js <number_of_keys>

const fs = require('fs');

function generateKey() {
  return 'mindspire-' + Math.floor(100000000 + Math.random() * 900000000);
}

function generateKeys(count) {
  const keys = new Set();
  while (keys.size < count) {
    keys.add(generateKey());
  }
  return Array.from(keys);
}

const num = parseInt(process.argv[2], 10) || 1;
const keys = generateKeys(num);

console.log('Generated License Keys:');
keys.forEach(k => console.log(k));

// Optionally save to file
fs.writeFileSync('license_keys.txt', keys.join('\n'));
console.log(`\nSaved to license_keys.txt`);
