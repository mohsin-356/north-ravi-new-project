
export interface BarcodeResult {
  code: string;
  format: string;
  success: boolean;
  error?: string;
}

export class BarcodeScanner {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private scanning = false;

  async initializeCamera(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        }
      });

      if (this.video) {
        this.video.srcObject = stream;
        await this.video.play();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Camera initialization failed:', error);
      return false;
    }
  }

  async startScanning(
    videoElement: HTMLVideoElement,
    onScan: (result: BarcodeResult) => void
  ): Promise<void> {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');

    if (!this.context) {
      throw new Error('Could not get canvas context');
    }

    const cameraInitialized = await this.initializeCamera();
    if (!cameraInitialized) {
      throw new Error('Could not initialize camera');
    }

    this.scanning = true;
    this.scanLoop(onScan);
  }

  private scanLoop(onScan: (result: BarcodeResult) => void): void {
    if (!this.scanning || !this.video || !this.canvas || !this.context) {
      return;
    }

    if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;

      this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      
      const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      // Simple barcode detection (in a real implementation, you'd use a library like QuaggaJS)
      const detectedCode = this.detectBarcode(imageData);
      
      if (detectedCode) {
        onScan({
          code: detectedCode,
          format: 'CODE128', // Assume CODE128 format
          success: true
        });
        return;
      }
    }

    requestAnimationFrame(() => this.scanLoop(onScan));
  }

  private detectBarcode(imageData: ImageData): string | null {
    // This is a simplified implementation
    // In a real app, you would use a proper barcode detection library
    
    // For demo purposes, we'll simulate barcode detection
    // You should integrate with libraries like:
    // - QuaggaJS
    // - ZXing-js
    // - @zxing/library
    
    return null; // Return null for now
  }

  stopScanning(): void {
    this.scanning = false;
    
    if (this.video && this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }
  }

  // Manual barcode input fallback
  static validateBarcode(code: string): boolean {
    // Basic validation for common barcode formats
    if (!code || code.length < 8) return false;
    
    // Check if it's numeric (for EAN, UPC)
    if (/^\d+$/.test(code)) {
      return code.length === 8 || code.length === 12 || code.length === 13;
    }
    
    // Allow alphanumeric codes (Code 128, Code 39)
    if (/^[A-Z0-9\-\s]+$/i.test(code)) {
      return code.length >= 8 && code.length <= 25;
    }
    
    return false;
  }

  static formatBarcode(code: string): string {
    // Remove any spaces and convert to uppercase
    return code.replace(/\s+/g, '').toUpperCase();
  }
}

// Utility function to integrate barcode scanning with medicine search
export const searchMedicineByBarcode = async (
  barcode: string,
  medicines: any[]
): Promise<any | null> => {
  const formattedBarcode = BarcodeScanner.formatBarcode(barcode);
  
  // Search in medicine database
  const found = medicines.find(medicine => 
    medicine.barcode === formattedBarcode ||
    medicine.barcode === barcode
  );
  
  return found || null;
};

// Demo barcode codes for testing
export const DEMO_BARCODES = [
  '123456789012', // Panadol Extra
  '123456789013', // Augmentin 625mg
  '123456789014', // Brufen 400mg
  '123456789015', // Disprol Syrup
  '123456789016'  // Vitamin C
];
