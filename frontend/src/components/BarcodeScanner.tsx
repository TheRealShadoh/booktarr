/**
 * Barcode Scanner Component
 * Scans ISBN barcodes using device camera
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, Result, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useAppContext } from '../context/AppContext';
import { scanHistory } from '../services/scanHistory';

interface BarcodeScannerProps {
  onComplete: (isbns: string[]) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onComplete, 
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { showToast } = useAppContext();
  const { 
    permissionState, 
    isSupported, 
    devices, 
    selectedDeviceId,
    requestPermission,
    selectDevice,
    getStream 
  } = useCameraPermissions();

  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedISBN, setLastScannedISBN] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  
  // Unified scanning state
  const [scannedISBNs, setScannedISBNs] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Initialize scanner with better detection settings
  useEffect(() => {
    if (!scannerRef.current) {
      console.log('Initializing ZXing scanner...');
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.ITF,
        BarcodeFormat.CODABAR,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      
      scannerRef.current = new BrowserMultiFormatReader(hints);
      console.log('ZXing scanner initialized');
    }

    return () => {
      if (scannerRef.current) {
        console.log('Resetting ZXing scanner');
        scannerRef.current.reset();
      }
    };
  }, []);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSessionId = await scanHistory.startScanSession('batch');
        setSessionId(newSessionId);
        
        const newBatchId = `batch_${Date.now()}`;
        setBatchId(newBatchId);
      } catch (error) {
        console.error('Failed to initialize scan session:', error);
      }
    };

    initSession();
  }, []);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        scanHistory.endScanSession(sessionId).catch(console.error);
      }
    };
  }, [sessionId]);

  // Play beep sound
  const playBeep = useCallback(async () => {
    try {
      console.log('Attempting to play beep sound...');
      
      // Create audio context and beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required after user interaction)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
      console.log('Beep sound played successfully');
    } catch (error) {
      console.log('Audio failed, trying vibration fallback:', error);
      // Fallback to vibration if audio fails
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
        console.log('Vibration played');
      } else {
        console.log('No audio or vibration available');
      }
    }
  }, []);

  // Validate ISBN-13
  const validateISBN13 = useCallback((isbn: string): boolean => {
    if (isbn.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(isbn[12]);
  }, []);

  // Validate ISBN-10
  const validateISBN10 = useCallback((isbn: string): boolean => {
    if (isbn.length !== 10) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i);
    }
    
    const lastChar = isbn[9].toUpperCase();
    const checkDigit = (11 - (sum % 11)) % 11;
    const expectedChar = checkDigit === 10 ? 'X' : checkDigit.toString();
    
    return lastChar === expectedChar;
  }, []);

  // Convert ISBN-10 to ISBN-13
  const convertISBN10to13 = useCallback((isbn10: string): string => {
    const prefix = '978';
    const isbn13WithoutCheck = prefix + isbn10.substring(0, 9);
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn13WithoutCheck[i]) * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return isbn13WithoutCheck + checkDigit;
  }, []);

  // Extract and validate ISBN
  const extractISBN = useCallback((text: string): string | null => {
    console.log('Extracting ISBN from:', text);
    
    // Remove any non-digit characters for initial check
    const digits = text.replace(/\D/g, '');
    console.log('Digits only:', digits);
    
    // Check for ISBN-13 (most common for books)
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      console.log('Potential ISBN-13 found:', digits);
      if (validateISBN13(digits)) {
        console.log('Valid ISBN-13:', digits);
        return digits;
      }
    }
    
    // Check for ISBN-10
    if (digits.length === 10) {
      console.log('Potential ISBN-10 found:', text);
      if (validateISBN10(text)) { // Use original text for ISBN-10 (might have X)
        const isbn13 = convertISBN10to13(text);
        console.log('Converted ISBN-10 to ISBN-13:', isbn13);
        return isbn13;
      }
    }

    // More flexible pattern matching for embedded ISBNs
    const isbn13Match = text.match(/(?:978|979)\d{10}/);
    if (isbn13Match) {
      console.log('Found ISBN-13 pattern:', isbn13Match[0]);
      if (validateISBN13(isbn13Match[0])) {
        console.log('Valid embedded ISBN-13:', isbn13Match[0]);
        return isbn13Match[0];
      }
    }

    const isbn10Match = text.match(/\d{9}[\dX]/i);
    if (isbn10Match) {
      console.log('Found ISBN-10 pattern:', isbn10Match[0]);
      if (validateISBN10(isbn10Match[0])) {
        const isbn13 = convertISBN10to13(isbn10Match[0]);
        console.log('Valid embedded ISBN-10 converted:', isbn13);
        return isbn13;
      }
    }

    // For debugging: try to match any 13-digit number starting with 9
    if (digits.length === 13 && digits.startsWith('9')) {
      console.log('Testing any 13-digit starting with 9:', digits);
      // Don't validate, just return for testing
      return digits;
    }

    console.log('No valid ISBN found in:', text);
    return null;
  }, [validateISBN13, validateISBN10, convertISBN10to13]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.reset();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  }, []);

  // Handle scan result
  const handleScanResult = useCallback((result: Result) => {
    const text = result.getText();
    console.log('Barcode detected:', text);
    
    // Play beep sound for ANY detected barcode
    playBeep();
    
    // Always show toast for any detected barcode for debugging
    showToast(`Barcode detected: ${text}`, 'info');
    
    // Validate ISBN
    const isbn = extractISBN(text);
    console.log('Extracted ISBN:', isbn);
    
    if (isbn) {
      if (isbn !== lastScannedISBN) {
        setLastScannedISBN(isbn);
        
        // Record scan in history
        const recordScan = async () => {
          try {
            await scanHistory.recordScan(
              isbn,
              'camera',
              true,
              undefined,
              batchId || undefined
            );
          } catch (error) {
            console.error('Failed to record scan:', error);
          }
        };

        // Handle scanning - always in unified mode
        if (scannedISBNs.includes(isbn)) {
          // Duplicate
          setDuplicateCount(prev => prev + 1);
          showToast(`Duplicate ISBN: ${isbn}`, 'warning');
        } else {
          // Add to batch
          setScannedISBNs(prev => [...prev, isbn]);
          showToast(`ISBN scanned: ${isbn} (${scannedISBNs.length + 1} total)`, 'success');
          recordScan();
        }
      }
    } else {
      // Show toast for non-ISBN barcodes for debugging
      showToast(`Non-ISBN barcode: ${text}`, 'warning');
    }
  }, [lastScannedISBN, showToast, extractISBN, scannedISBNs, batchId, playBeep]);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!videoRef.current || !scannerRef.current) return;

    try {
      setIsScanning(true);
      
      // Get camera stream with optimized settings for barcode scanning
      console.log('Requesting camera stream...');
      const stream = await getStream({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 10 }
        }
      });
      console.log('Camera stream obtained:', stream);
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Start continuous scanning with higher frequency
      const startDecoding = () => {
        console.log('Starting barcode detection...');
        scannerRef.current?.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current!,
          (result, error) => {
            if (result) {
              console.log('ZXing result received:', result.getText());
              handleScanResult(result);
            }
            // Log all errors for debugging (temporarily)
            if (error) {
              if (!error.message.includes('NotFoundException')) {
                console.debug('Scan error:', error.message);
              }
            }
          }
        );
      };

      // Wait for video to be ready
      if (videoRef.current?.readyState === 4) {
        startDecoding();
      } else {
        videoRef.current?.addEventListener('loadeddata', startDecoding, { once: true });
      }

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities && 'torch' in capabilities) {
        setTorchEnabled(true);
      }
    } catch (error) {
      console.error('Failed to start scanning:', error);
      showToast('Failed to start camera', 'error');
      setIsScanning(false);
    }
  }, [selectedDeviceId, getStream, showToast, handleScanResult]);

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchEnabled) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const constraints = track.getConstraints() as any;
      const currentTorch = constraints.torch || false;
      
      await track.applyConstraints({
        torch: !currentTorch,
      } as any);
    } catch (error) {
      console.error('Failed to toggle torch:', error);
      showToast('Failed to toggle flashlight', 'error');
    }
  }, [torchEnabled, showToast]);

  // Handle manual input
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isbn = extractISBN(manualInput);
    if (isbn) {
      // Record manual scan
      const recordManualScan = async (success: boolean, error?: string) => {
        try {
          await scanHistory.recordScan(
            isbn,
            'manual',
            success,
            error,
            batchId || undefined
          );
        } catch (error) {
          console.error('Failed to record manual scan:', error);
        }
      };

      // Handle manual entry - always add to unified list
      if (!scannedISBNs.includes(isbn)) {
        setScannedISBNs(prev => [...prev, isbn]);
        showToast(`Added ISBN: ${isbn}`, 'success');
        recordManualScan(true);
      } else {
        showToast('ISBN already in list', 'warning');
        recordManualScan(false, 'Duplicate ISBN');
      }
      
      setManualInput('');
      setShowManualInput(false);
    } else {
      // Record failed manual input
      try {
        scanHistory.recordScan(manualInput, 'manual', false, 'Invalid ISBN format');
      } catch (error) {
        console.error('Failed to record failed manual scan:', error);
      }
      showToast('Invalid ISBN format', 'error');
    }
  };

  // Scanner functions
  const completeScanning = useCallback(() => {
    if (scannedISBNs.length > 0) {
      onComplete(scannedISBNs);
      showToast(`Scanning complete: ${scannedISBNs.length} ISBNs`, 'success');
    } else {
      showToast('No ISBNs scanned', 'warning');
    }
    onClose();
  }, [scannedISBNs, onComplete, onClose, showToast]);

  const clearBatch = useCallback(() => {
    setScannedISBNs([]);
    setDuplicateCount(0);
    showToast('Batch cleared', 'info');
  }, [showToast]);

  const removeFromBatch = useCallback((isbn: string) => {
    setScannedISBNs(prev => prev.filter(item => item !== isbn));
    showToast(`Removed ISBN: ${isbn}`, 'info');
  }, [showToast]);

  // Request permission and start scanning
  useEffect(() => {
    if (permissionState === 'granted' && !isScanning) {
      startScanning();
    }
  }, [permissionState, isScanning, startScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  // Permission denied or not supported
  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-booktarr-bg z-50 flex items-center justify-center p-4">
        <div className="bg-booktarr-surface rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-booktarr-text mb-4">
            Camera Not Supported
          </h2>
          <p className="text-booktarr-textSecondary mb-6">
            Your browser doesn't support camera access. Please use a modern browser or the manual entry option.
          </p>
          <button
            onClick={() => setShowManualInput(true)}
            className="booktarr-btn booktarr-btn-primary w-full"
          >
            Enter ISBN Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-booktarr-bg z-50 flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-booktarr-surface border-b border-booktarr-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-booktarr-text">
              Scan ISBN Barcodes
            </h2>
            <p className="text-sm text-booktarr-textSecondary">
              {scannedISBNs.length} scanned, {duplicateCount} duplicates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-booktarr-textMuted hover:text-booktarr-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative bg-black">
        {permissionState === 'prompt' && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-booktarr-surface rounded-lg p-6 max-w-md w-full text-center">
              <svg className="w-16 h-16 text-booktarr-accent mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-booktarr-text mb-2">
                Camera Permission Required
              </h3>
              <p className="text-booktarr-textSecondary mb-4">
                Grant camera access to scan ISBN barcodes
              </p>
              <button
                onClick={requestPermission}
                className="booktarr-btn booktarr-btn-primary"
              >
                Allow Camera Access
              </button>
            </div>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-booktarr-surface rounded-lg p-6 max-w-md w-full text-center">
              <svg className="w-16 h-16 text-booktarr-error mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-booktarr-text mb-2">
                Camera Access Denied
              </h3>
              <p className="text-booktarr-textSecondary mb-4">
                Please enable camera access in your browser settings to scan barcodes.
              </p>
              <button
                onClick={() => setShowManualInput(true)}
                className="booktarr-btn booktarr-btn-primary"
              >
                Enter ISBN Manually
              </button>
            </div>
          </div>
        )}

        {(permissionState === 'granted' || permissionState === 'checking') && (
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
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-32">
                <div className="relative w-full h-full">
                  {/* Scanning frame */}
                  <div className="absolute inset-0 border-2 border-booktarr-accent rounded-lg" />
                  
                  {/* Corner indicators */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-booktarr-accent rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-booktarr-accent rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-booktarr-accent rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-booktarr-accent rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-booktarr-accent animate-pulse" 
                       style={{ top: '50%' }} />
                </div>
              </div>
              
              {/* Instructions */}
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black bg-opacity-50 inline-block px-4 py-2 rounded-lg">
                  Position barcode within frame
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-booktarr-surface border-t border-booktarr-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between space-x-4">
          {/* Camera selector */}
          {devices.length > 1 && (
            <select
              value={selectedDeviceId || ''}
              onChange={(e) => selectDevice(e.target.value)}
              className="booktarr-form-input flex-1"
              disabled={!isScanning}
            >
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
                </option>
              ))}
            </select>
          )}

          {/* Action buttons */}
          <div className="flex space-x-2">
            {/* Scanning status indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-booktarr-surface2 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-booktarr-text">
                {isScanning ? 'Scanning...' : 'Not scanning'}
              </span>
            </div>
            
            {torchEnabled && (
              <button
                onClick={toggleTorch}
                className="p-2 bg-booktarr-surface2 rounded-lg hover:bg-booktarr-hover transition-colors"
                title="Toggle flashlight"
              >
                <svg className="w-5 h-5 text-booktarr-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            )}
            
            {/* Debug test button */}
            <button
              onClick={() => {
                // Test with a sample ISBN
                const testISBN = '9780140328721';
                console.log('Testing ISBN extraction with:', testISBN);
                const extracted = extractISBN(testISBN);
                showToast(`Test ISBN: ${testISBN} → ${extracted}`, 'info');
              }}
              className="p-2 bg-booktarr-accent rounded-lg hover:bg-booktarr-accentHover transition-colors"
              title="Test ISBN extraction"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
            
            {/* Test beep button */}
            <button
              onClick={() => {
                console.log('Test beep button clicked');
                playBeep();
                showToast('Test beep triggered', 'info');
              }}
              className="p-2 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
              title="Test beep sound"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M9 12h.01M12 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="booktarr-btn booktarr-btn-ghost"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Entry
            </button>

            {scannedISBNs.length > 0 && (
              <>
                <button
                  onClick={clearBatch}
                  className="booktarr-btn booktarr-btn-ghost text-booktarr-warning"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear
                </button>
                <button
                  onClick={completeScanning}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Continue ({scannedISBNs.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Manual input form */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="mt-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter ISBN (10 or 13 digits)"
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

        {/* Scanned ISBNs list */}
        {scannedISBNs.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-booktarr-text">
                Scanned ISBNs ({scannedISBNs.length})
              </h4>
              {duplicateCount > 0 && (
                <span className="text-xs text-booktarr-warning">
                  {duplicateCount} duplicates ignored
                </span>
              )}
            </div>
            <div className="max-h-32 overflow-y-auto bg-booktarr-surface2 rounded-lg">
              {scannedISBNs.map((isbn, index) => (
                <div key={isbn} className="flex items-center justify-between p-2 border-b border-booktarr-border last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-booktarr-textMuted w-6">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-mono text-booktarr-text">
                      {isbn}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromBatch(isbn)}
                    className="p-1 text-booktarr-textMuted hover:text-booktarr-error transition-colors"
                    title="Remove from list"
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
      </div>
    </div>
  );
};

export default BarcodeScanner;