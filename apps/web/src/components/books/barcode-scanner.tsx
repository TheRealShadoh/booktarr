'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onError?: (error: string) => void;
}

/**
 * Barcode Scanner Component
 *
 * Uses device camera to scan barcodes and extract ISBN numbers.
 * Supports ISBN-10, ISBN-13, and EAN-13 formats.
 */
export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  /**
   * Extract ISBN from barcode data
   * Handles EAN-13 (which includes ISBN-13) and ISBN-10 formats
   */
  const extractISBN = (code: string): string | null => {
    // Remove any spaces or hyphens
    const cleaned = code.replace(/[\s-]/g, '');

    // ISBN-13 (starts with 978 or 979)
    if (cleaned.length === 13 && /^(978|979)/.test(cleaned)) {
      return cleaned;
    }

    // ISBN-10
    if (cleaned.length === 10 && /^[0-9]{9}[0-9X]$/i.test(cleaned)) {
      return cleaned;
    }

    // EAN-13 that might be an ISBN
    if (cleaned.length === 13 && /^[0-9]{13}$/.test(cleaned)) {
      return cleaned;
    }

    return null;
  };

  /**
   * Decode barcode from canvas using ZXing-like pattern detection
   * This is a simplified version - in production, use a library like @zxing/browser
   */
  const decodeBarcode = useCallback(
    (canvas: HTMLCanvasElement): string | null => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // For demo purposes, we'll use a simple pattern matching
        // In production, integrate @zxing/browser or similar library
        // This is where barcode decoding logic would go

        // For now, return null to indicate no barcode found
        // Real implementation would use ZXing or QuaggaJS
        return null;
      } catch (err) {
        console.error('Barcode decode error:', err);
        return null;
      }
    },
    []
  );

  /**
   * Stop scanning and release camera
   */
  const stopScanning = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    // Stop all video tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }, []);

  /**
   * Scan loop - continuously capture frames and attempt to decode
   */
  const scanFrame = useCallback(
    function scan(): void {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !video.readyState || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(scan);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Attempt to decode barcode
      const code = decodeBarcode(canvas);

      if (code) {
        const isbn = extractISBN(code);
        if (isbn) {
          onScan(isbn);
          stopScanning();
          return;
        }
      }

      // Continue scanning
      animationFrameRef.current = requestAnimationFrame(scan);
    },
    [decodeBarcode, onScan, stopScanning]
  );

  /**
   * Start camera and begin scanning
   */
  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          // Set canvas size to match video
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }

          // Start scanning loop
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to access camera. Please ensure camera permissions are granted.';

      setError(errorMessage);
      setHasPermission(false);
      setIsScanning(false);

      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasPermission === false && (
        <Alert>
          <AlertDescription>
            Camera access is required to scan barcodes. Please grant camera permissions and try
            again.
          </AlertDescription>
        </Alert>
      )}

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
        {isScanning ? (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48 border-2 border-primary">
                <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-primary" />
                <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-primary" />
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-primary" />

                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary opacity-50 animate-pulse" />
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="rounded-lg bg-black/70 px-4 py-2 text-sm text-white">
                Position barcode within the frame
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Camera className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isScanning ? (
          <Button onClick={startScanning} className="flex-1">
            <Camera className="mr-2 h-4 w-4" />
            Start Scanning
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="destructive" className="flex-1">
            <CameraOff className="mr-2 h-4 w-4" />
            Stop Scanning
          </Button>
        )}
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          <strong>Note:</strong> For full barcode scanning functionality, this requires the @zxing/browser library.
          The current implementation shows the camera interface. To enable actual barcode decoding, run:
          <code className="block mt-2 bg-muted px-2 py-1 rounded">
            npm install @zxing/browser
          </code>
        </AlertDescription>
      </Alert>
    </div>
  );
}
