/**
 * Simple Barcode Scanner - Focused on reliability over features
 * Uses a straightforward approach to get camera working quickly
 */
import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { useAppContext } from '../context/AppContext';

interface SimpleBarcodeScannerProps {
  onComplete: (isbns: string[]) => void;
  onClose: () => void;
}

const SimpleBarcodeScanner: React.FC<SimpleBarcodeScannerProps> = ({ onComplete, onClose }) => {
  const { showToast } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannedISBNs, setScannedISBNs] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize code reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  // Check camera permission and start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log('Requesting camera permission...');
        
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this device/browser');
        }

        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Try to use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        console.log('Camera permission granted, stream obtained');
        setPermissionStatus('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded');
            setCameraReady(true);
          };
          
          videoRef.current.oncanplay = () => {
            console.log('Video can play');
            videoRef.current?.play().then(() => {
              console.log('Video playing');
            }).catch(err => {
              console.error('Failed to play video:', err);
            });
          };
        }

      } catch (err: any) {
        console.error('Camera permission denied or not available:', err);
        setError(err.message || 'Camera access failed');
        setPermissionStatus('denied');
      }
    };

    startCamera();
  }, []);

  // Start scanning when camera is ready
  useEffect(() => {
    if (!cameraReady || !videoRef.current || !codeReaderRef.current) {
      console.log('Not ready to scan:', { cameraReady, video: !!videoRef.current, reader: !!codeReaderRef.current });
      return;
    }

    let scanning = true;
    setIsScanning(true);

    const scanFrame = async () => {
      if (!scanning || !videoRef.current || !codeReaderRef.current) return;

      try {
        console.log('Attempting to decode from video...');
        const result = await codeReaderRef.current.decodeFromVideoElement(videoRef.current);
        
        if (result) {
          const text = result.getText();
          console.log('Barcode detected:', text);
          
          // Simple ISBN extraction
          const isbn = extractISBN(text);
          console.log('Extracted ISBN:', isbn);
          
          if (isbn) {
            setScannedISBNs(prev => {
              if (!prev.includes(isbn)) {
                showToast(`📚 ISBN: ${isbn}`, 'success');
                playBeep();
                return [...prev, isbn];
              }
              return prev;
            });
          } else {
            console.log('Not an ISBN, raw text:', text);
            showToast(`📷 Detected: ${text}`, 'info');
          }
        }
      } catch (err) {
        if (err instanceof NotFoundException) {
          // No barcode found in this frame, continue scanning
        } else {
          console.error('Scan error:', err);
        }
      }

      // Continue scanning
      if (scanning) {
        setTimeout(scanFrame, 100); // Scan every 100ms
      }
    };

    console.log('Starting continuous scan...');
    scanFrame();

    return () => {
      console.log('Stopping scan...');
      scanning = false;
      setIsScanning(false);
    };
  }, [cameraReady, showToast]);

  // Extract ISBN from barcode text
  const extractISBN = (text: string): string | null => {
    const digits = text.replace(/\D/g, '');
    
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      return digits;
    }
    
    if (digits.length === 10) {
      return '978' + digits.substring(0, 9);
    }
    
    return null;
  };

  // Play beep sound
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.value = 0.2;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log('Audio not available');
    }
  };

  const handleComplete = () => {
    if (scannedISBNs.length > 0) {
      onComplete(scannedISBNs);
    } else {
      showToast('No ISBNs scanned', 'warning');
    }
    onClose();
  };

  const handleManualAdd = () => {
    const isbn = prompt('Enter ISBN manually:');
    if (isbn) {
      const cleanISBN = extractISBN(isbn);
      if (cleanISBN) {
        setScannedISBNs(prev => {
          if (!prev.includes(cleanISBN)) {
            showToast(`✅ Added: ${cleanISBN}`, 'success');
            return [...prev, cleanISBN];
          }
          return prev;
        });
      } else {
        showToast('Invalid ISBN format', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-booktarr-surface p-4 border-b border-booktarr-border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-booktarr-text">
              Barcode Scanner
            </h2>
            <p className="text-sm text-booktarr-textSecondary">
              📚 {scannedISBNs.length} ISBNs found | 
              Status: {permissionStatus} | 
              {isScanning ? '📷 Scanning...' : '⏸️ Not scanning'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-booktarr-surface2 rounded text-booktarr-text"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black">
        {permissionStatus === 'checking' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}

        {permissionStatus === 'denied' && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-white text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
              <p className="text-sm text-gray-300 mb-4">
                {error || 'Please allow camera access to scan barcodes'}
              </p>
              <button
                onClick={handleManualAdd}
                className="bg-booktarr-accent text-white px-4 py-2 rounded hover:bg-booktarr-accentHover"
              >
                Enter ISBN Manually
              </button>
            </div>
          </div>
        )}

        {permissionStatus === 'granted' && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black bg-opacity-30" />
              
              {/* Scanning frame */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40">
                <div className="border-4 border-green-500 rounded-lg w-full h-full relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  
                  {/* Scanning line */}
                  <div className="absolute inset-x-0 h-1 bg-green-500 animate-pulse" style={{ top: '50%' }}></div>
                </div>
              </div>
              
              <div className="absolute bottom-20 left-0 right-0 text-center">
                <div className="bg-black bg-opacity-70 inline-block px-4 py-2 rounded">
                  <p className="text-white text-sm">
                    📚 Point camera at ISBN barcode
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-booktarr-surface border-t border-booktarr-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-booktarr-text text-sm">
              {cameraReady ? 'Camera Ready' : 'Initializing...'}
            </span>
            {scannedISBNs.length > 0 && (
              <span className="text-booktarr-accent text-sm font-semibold">
                {scannedISBNs.length} ISBNs found
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleManualAdd}
              className="bg-booktarr-surface2 text-booktarr-text px-3 py-2 rounded hover:bg-booktarr-hover"
            >
              Manual Entry
            </button>
            
            {scannedISBNs.length > 0 && (
              <button
                onClick={handleComplete}
                className="bg-booktarr-accent text-white px-4 py-2 rounded hover:bg-booktarr-accentHover"
              >
                Continue ({scannedISBNs.length})
              </button>
            )}
          </div>
        </div>
        
        {/* Scanned ISBNs List */}
        {scannedISBNs.length > 0 && (
          <div className="mt-4 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {scannedISBNs.map((isbn, index) => (
                <span
                  key={isbn}
                  className="bg-booktarr-accent bg-opacity-20 text-booktarr-accent px-2 py-1 rounded text-sm"
                >
                  {index + 1}. {isbn}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleBarcodeScanner;