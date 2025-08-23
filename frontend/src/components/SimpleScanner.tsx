/**
 * Simple Barcode Scanner - Canvas-based approach
 * Avoids all video control conflicts by capturing frames to canvas
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useAppContext } from '../context/AppContext';

interface SimpleScannerProps {
  onComplete: (isbns: string[]) => void;
  onClose: () => void;
}

const SimpleScanner: React.FC<SimpleScannerProps> = ({ onComplete, onClose }) => {
  const { showToast } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  
  const [scannedISBNs, setScannedISBNs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanStatus, setScanStatus] = useState('Initializing...');

  // Initialize scanner
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    scannerRef.current = new BrowserMultiFormatReader(hints);
    console.log('Scanner initialized');
    
    return () => {
      mountedRef.current = false;
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);

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

  // Extract ISBN from barcode text
  const extractISBN = useCallback((text: string): string | null => {
    const digits = text.replace(/\D/g, '');
    
    // Check for 13-digit ISBN
    if (digits.length === 13) {
      return digits;
    }
    
    // Check for 10-digit ISBN (convert to 13)
    if (digits.length === 10) {
      return '978' + digits.substring(0, 9);
    }
    
    return null;
  }, []);

  // Scan from video
  const scanFromVideo = useCallback(async () => {
    if (!videoRef.current || !scannerRef.current || !mountedRef.current) {
      return;
    }

    try {
      // Use decodeFromVideoElement but pass a static video element
      // This avoids ZXing trying to control playback
      const result = await scannerRef.current.decodeFromVideoElement(videoRef.current);
      if (result && mountedRef.current) {
        const text = result.getText();
        console.log('Barcode detected:', text);
        playBeep();
        
        const isbn = extractISBN(text);
        if (isbn) {
          setScannedISBNs(prev => {
            if (!prev.includes(isbn)) {
              showToast(`ISBN scanned: ${isbn}`, 'success');
              return [...prev, isbn];
            } else {
              showToast(`Duplicate ISBN: ${isbn}`, 'warning');
              return prev;
            }
          });
        } else {
          showToast(`Not an ISBN: ${text}`, 'info');
        }
      }
    } catch (error) {
      // Expected when no barcode found
    }
  }, [playBeep, extractISBN, showToast]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setScanStatus('Requesting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready and start scanning
        videoRef.current.onloadedmetadata = () => {
          if (!mountedRef.current) return;
          
          setScanStatus('Scanning...');
          // Start scanning loop
          scanIntervalRef.current = window.setInterval(() => {
            scanFromVideo();
          }, 250); // Scan 4 times per second
        };
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setError(error.message || 'Failed to access camera');
      setScanStatus('Camera error');
    }
  }, [scanFromVideo]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start on mount
  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  // Handle manual ISBN input
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isbn = extractISBN(manualInput);
    if (isbn && !scannedISBNs.includes(isbn)) {
      setScannedISBNs(prev => [...prev, isbn]);
      setManualInput('');
      setShowManualInput(false);
      playBeep();
      showToast(`ISBN added: ${isbn}`, 'success');
    } else {
      showToast('Invalid ISBN format', 'error');
    }
  };

  // Complete scanning
  const handleComplete = () => {
    if (scannedISBNs.length > 0) {
      onComplete(scannedISBNs);
      showToast(`Processing ${scannedISBNs.length} ISBN${scannedISBNs.length !== 1 ? 's' : ''}`, 'success');
    } else {
      showToast('No ISBNs scanned', 'warning');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-booktarr-surface border-b border-booktarr-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-booktarr-text">Scan ISBN Barcodes</h2>
            <p className="text-sm text-booktarr-textSecondary mt-1">
              {scannedISBNs.length} ISBN{scannedISBNs.length !== 1 ? 's' : ''} scanned - {scanStatus}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-booktarr-surface2 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-booktarr-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-booktarr-surface rounded-lg p-6 max-w-md text-center">
              <svg className="w-16 h-16 text-booktarr-error mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-booktarr-text mb-2">Camera Error</h3>
              <p className="text-booktarr-textSecondary mb-4">{error}</p>
              <button
                onClick={() => setShowManualInput(true)}
                className="booktarr-btn booktarr-btn-primary"
              >
                Enter ISBN Manually
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
            
            
            {/* Scan frame overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-48">
                <div className="w-full h-full border-2 border-booktarr-accent rounded-lg" />
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <p className="text-white text-sm">Position barcode within frame</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-booktarr-surface border-t border-booktarr-border p-4">
        {/* Scanned ISBNs */}
        {scannedISBNs.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-booktarr-textSecondary mb-2">Scanned ISBNs:</p>
            <div className="flex flex-wrap gap-2">
              {scannedISBNs.map((isbn, index) => (
                <div
                  key={`simple-scanned-${isbn}-${index}`}
                  className="bg-booktarr-surface2 px-3 py-1 rounded-full text-sm text-booktarr-text flex items-center gap-2"
                >
                  <span>{isbn}</span>
                  <button
                    onClick={() => setScannedISBNs(prev => prev.filter((_, i) => i !== index))}
                    className="hover:text-booktarr-error"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="booktarr-btn booktarr-btn-secondary"
          >
            Manual Entry
          </button>
          
          <button
            onClick={() => setScannedISBNs([])}
            className="booktarr-btn booktarr-btn-secondary"
            disabled={scannedISBNs.length === 0}
          >
            Clear All
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={handleComplete}
            className="booktarr-btn booktarr-btn-primary"
            disabled={scannedISBNs.length === 0}
          >
            Add {scannedISBNs.length} Book{scannedISBNs.length !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Manual input */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ISBN..."
                className="booktarr-form-input flex-1"
                autoFocus
              />
              <button
                type="submit"
                className="booktarr-btn booktarr-btn-primary"
              >
                Add
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SimpleScanner;