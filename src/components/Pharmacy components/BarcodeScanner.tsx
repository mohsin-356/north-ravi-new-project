import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, Barcode } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);

  // Initialize barcode detector
  useEffect(() => {
    // @ts-ignore - BarcodeDetector is not in TypeScript's DOM types yet
    if ('BarcodeDetector' in window) {
      // @ts-ignore
      barcodeDetectorRef.current = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf']
      });
    } else {
      setError('Your browser does not support barcode scanning');
    }

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        setError(null);
        detectBarcode();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access was denied. Please check camera permissions.');
    }
  };

  const stopScanning = () => {
    onClose(); // Notify parent component to close the dialog
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    setIsScanning(false);
  };

  const detectBarcode = async () => {
    if (!isScanning || !barcodeDetectorRef.current || !videoRef.current) {
      return;
    }

    try {
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const barcodes = await barcodeDetectorRef.current.detect(video);
        
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          onScan(barcode); // This will trigger the parent to close us
          return;
        }
      }
      
      // Continue scanning
      animationFrameRef.current = requestAnimationFrame(detectBarcode);
    } catch (err) {
      console.error('Error detecting barcode:', err);
      setError('Error reading barcode');
      stopScanning();
    }
  };

  const handleManualBarcode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const barcode = e.target.value.trim();
    if (barcode) {
      onScan(barcode);
      e.target.value = '';
    }
  };

  return (
    <div className="barcode-scanner">
      {!isScanning ? (
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startScanning}
            className="flex items-center"
          >
            <Camera className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>
          <span className="text-sm text-muted-foreground">
            or
          </span>
          <input
            type="text"
            placeholder={'Enter barcode'}
            onKeyPress={(e) => e.key === 'Enter' && handleManualBarcode(e as any)}
            className="border rounded px-2 py-1 text-sm w-40"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <div className="relative w-full max-w-md border rounded-md overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 border-4 border-green-500 rounded-md pointer-events-none" />
          </div>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={stopScanning}
              className="flex items-center"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default BarcodeScanner;
