
export const generateBarcode = (): string => {
  // Generate a 12-digit barcode
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  return digits.join('');
};

export const generateSVGBarcode = (code: string): string => {
  // Simple Code 128 barcode pattern simulation
  const patterns = {
    '0': '11011001100',
    '1': '11001101100',
    '2': '11001100110',
    '3': '10010011000',
    '4': '10010001100',
    '5': '10001001100',
    '6': '10011001000',
    '7': '10011000100',
    '8': '10001100100',
    '9': '11001001000'
  };

  let barcodePattern = '';
  for (const digit of code) {
    barcodePattern += patterns[digit as keyof typeof patterns] || '11000000000';
  }

  // Convert pattern to SVG bars
  let x = 0;
  const bars = [];
  const barWidth = 2;
  const height = 60;

  for (let i = 0; i < barcodePattern.length; i++) {
    if (barcodePattern[i] === '1') {
      bars.push(`<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`);
    }
    x += barWidth;
  }

  return `
    <svg width="${x}" height="${height + 20}" xmlns="http://www.w3.org/2000/svg">
      ${bars.join('')}
      <text x="${x / 2}" y="${height + 15}" text-anchor="middle" font-family="monospace" font-size="12">${code}</text>
    </svg>
  `;
};
