'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onError?: (error: string) => void;
  continuous?: boolean; // Keep scanning after a successful scan (bulk mode)
}

/**
 * Play a short confirmation beep using the Web Audio API and trigger a brief
 * haptic vibration if the device supports it. Safe to call in any browser —
 * silently no-ops when the APIs are unavailable.
 */
export function playScanFeedback(): void {
  // Haptic feedback — ~80 ms is perceptible without being intrusive
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(80);
  }

  // Audible beep via Web Audio API
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    // Short 880 Hz tone — high enough to sound like a scanner beep
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);

    // Quick ramp-down envelope to avoid an abrupt click at the end
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);

    // Close the context once the note has finished to free resources
    oscillator.onended = () => {
      ctx.close().catch(() => undefined);
    };
  } catch {
    // Web Audio API unavailable or suspended — fail silently
  }
}

const SCAN_TIMEOUT_MS = 30_000;
const SCAN_INTERVAL_MS = 200; // ~5fps - enough for barcode detection

/**
 * Barcode Scanner Component
 *
 * Uses device camera + @zxing/browser to scan ISBN barcodes.
 * Supports ISBN-10, ISBN-13, and EAN-13 formats.
 */
export function BarcodeScanner({ onScan, onError, continuous = false }: BarcodeScannerProps) {
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [isScanning, setIsScanning] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  /**
   * Extract ISBN from barcode data
   */
  const extractISBN = (code: string): string | null => {
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
   * Stop scanning and release camera
   */
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = undefined;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setIsTimedOut(false);
  }, []);

  /**
   * Start the scan loop using ZXing canvas decoding
   */
  const startScanLoop = useCallback(
    async (onFound: (isbn: string) => void) => {
      // Dynamically import ZXing to keep initial bundle lean
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();

      scanIntervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw current video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        try {
          // Decode barcode from canvas (synchronous)
          const result = reader.decodeFromCanvas(canvas);
          if (result) {
            const text = result.getText();
            const isbn = extractISBN(text);
            if (isbn) {
              onFound(isbn);
            }
          }
        } catch {
          // NotFoundException is expected when no barcode is in frame
        }
      }, SCAN_INTERVAL_MS);

      // Timeout after 30 seconds
      timeoutRef.current = setTimeout(() => {
        setIsTimedOut(true);
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = undefined;
        }
      }, SCAN_TIMEOUT_MS);
    },
    []
  );

  /**
   * Start camera and begin scanning
   */
  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      setIsTimedOut(false);

      // Request camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start the scan loop
      await startScanLoop((isbn: string) => {
        if (continuous) {
          // In bulk mode, prevent duplicate scans within 3 seconds
          const now = Date.now();
          if (isbn === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
            return;
          }
          lastScannedRef.current = isbn;
          lastScanTimeRef.current = now;
          playScanFeedback();
          onScan(isbn);
          // Reset timeout in continuous mode
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              setIsTimedOut(true);
              if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = undefined;
              }
            }, SCAN_TIMEOUT_MS);
          }
        } else {
          playScanFeedback();
          onScan(isbn);
          stopScanning();
        }
      });
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

      logger.error('Barcode scanner error', err instanceof Error ? err : new Error(String(err)));
    }
  };

  /**
   * Retry scanning after timeout
   */
  const retryScan = async () => {
    setIsTimedOut(false);
    await startScanning();
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
            again. HTTPS is required for camera access.
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
              <div className="relative h-48 w-64 border-2 border-primary">
                <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-primary" />
                <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-primary" />
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-primary" />
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-primary" />

                {!isTimedOut && (
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary opacity-50 animate-pulse" />
                )}
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="rounded-lg bg-black/70 px-4 py-2 text-sm text-white">
                {isTimedOut ? (
                  <span className="text-yellow-300">No barcode detected. Try adjusting position.</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Position barcode within the frame
                  </span>
                )}
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
        ) : isTimedOut ? (
          <>
            <Button onClick={retryScan} className="flex-1">
              <Camera className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button onClick={stopScanning} variant="outline" className="flex-1">
              <CameraOff className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </>
        ) : (
          <Button onClick={stopScanning} variant="destructive" className="flex-1">
            <CameraOff className="mr-2 h-4 w-4" />
            Stop Scanning
          </Button>
        )}
      </div>
    </div>
  );
}
