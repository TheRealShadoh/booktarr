/**
 * Isolated Barcode Scanner
 * Prevents ZXing from controlling video by never passing the video element
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useAppContext } from '../context/AppContext';

interface IsolatedScannerProps {
  onComplete: (isbns: string[]) => void;
  onClose: () => void;
}

const IsolatedScanner: React.FC<IsolatedScannerProps> = ({ onComplete, onClose }) => {
  const { showToast } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scannedISBNs, setScannedISBNs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Play beep sound
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Beep failed:', error);
    }
  }, []);

  // Extract ISBN
  const extractISBN = useCallback((text: string): string | null => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 13) return digits;
    if (digits.length === 10) return '978' + digits.substring(0, 9);
    return null;
  }, []);

  // Initialize camera
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsReady(true);
        }
      } catch (err: any) {
        setError(err.message || 'Camera access failed');
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Scanning logic - completely isolated from video element
  useEffect(() => {
    if (!isReady || !videoRef.current) return;

    let mounted = true;
    let scannerInterval: NodeJS.Timer | null = null;
    
    // Create scanner with hints
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    const scanner = new BrowserMultiFormatReader(hints);

    // Scan function that captures frame to canvas
    const scan = async () => {
      if (!mounted || !videoRef.current) return;

      try {
        // Create a canvas and capture current frame
        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob and then to image
        canvas.toBlob(async (blob) => {
          if (!blob || !mounted) return;
          
          const url = URL.createObjectURL(blob);
          const img = new Image();
          
          img.onload = async () => {
            try {
              const result = await scanner.decodeFromImageElement(img);
              if (result && mounted) {
                const text = result.getText();
                console.log('Detected:', text);
                playBeep();
                
                const isbn = extractISBN(text);
                if (isbn) {
                  setScannedISBNs(prev => {
                    if (!prev.includes(isbn)) {
                      showToast(`ISBN: ${isbn}`, 'success');
                      return [...prev, isbn];
                    }
                    return prev;
                  });
                }
              }
            } catch (e) {
              // No barcode found
            } finally {
              URL.revokeObjectURL(url);
            }
          };
          
          img.src = url;
        }, 'image/png');
      } catch (error) {
        // Ignore scan errors
      }
    };

    // Start scanning
    scannerInterval = setInterval(scan, 300);

    return () => {
      mounted = false;
      if (scannerInterval) clearInterval(scannerInterval);
      scanner.reset();
    };
  }, [isReady, playBeep, extractISBN, showToast]);

  const handleComplete = () => {
    if (scannedISBNs.length > 0) {
      onComplete(scannedISBNs);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-booktarr-surface p-4 border-b border-booktarr-border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-booktarr-text">
            Scan Barcodes ({scannedISBNs.length})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-booktarr-surface2 rounded">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-booktarr-surface p-6 rounded-lg text-center">
              <p className="text-booktarr-error mb-4">{error}</p>
              <button onClick={onClose} className="booktarr-btn booktarr-btn-primary">
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black bg-opacity-40" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-72 h-48 border-2 border-booktarr-accent rounded-lg" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-booktarr-surface p-4 border-t border-booktarr-border">
        {scannedISBNs.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {scannedISBNs.map((isbn, i) => (
              <span key={i} className="bg-booktarr-surface2 px-3 py-1 rounded-full text-sm">
                {isbn}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => setScannedISBNs([])}
            className="booktarr-btn booktarr-btn-secondary"
            disabled={scannedISBNs.length === 0}
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={handleComplete}
            className="booktarr-btn booktarr-btn-primary"
            disabled={scannedISBNs.length === 0}
          >
            Add {scannedISBNs.length} Books
          </button>
        </div>
      </div>
    </div>
  );
};

export default IsolatedScanner;