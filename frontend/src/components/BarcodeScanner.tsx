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
  const [, setLastScannedISBN] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  
  // Unified scanning state
  const [scannedISBNs, setScannedISBNs] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const [, setLastDetectionTime] = useState<number>(0);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [showDetectionFlash, setShowDetectionFlash] = useState(false);
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Initialize scanner with ISBN-optimized detection settings
  useEffect(() => {
    if (!scannerRef.current) {
      console.log('Initializing ZXing scanner with ISBN optimization...');
      const hints = new Map();
      
      // Optimized ISBN format priority (focus on most common book barcodes)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,    // Primary: ISBN-13 (978/979 prefix)
        BarcodeFormat.UPC_A,     // Secondary: UPC-A format books
        BarcodeFormat.EAN_8,     // Tertiary: Short ISBN format
        BarcodeFormat.CODE_128,  // Backup: Internal library barcodes
        BarcodeFormat.CODE_39,   // Backup: Legacy library systems
        // Removed less common formats to improve detection speed
      ]);
      
      // Enable comprehensive detection optimizations for ISBN scanning
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.ASSUME_GS1, true); // Many book barcodes use GS1 standards
      hints.set(DecodeHintType.RETURN_CODABAR_START_END, false); // Cleaner output
      
      // Create scanner with ISBN-optimized settings
      scannerRef.current = new BrowserMultiFormatReader(hints);
      console.log('ZXing scanner initialized with ISBN optimization');
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

  // Extract and validate ISBN - Enhanced for better book barcode detection
  const extractISBN = useCallback((text: string): string | null => {
    console.log('=== ISBN EXTRACTION DEBUG ===');
    console.log('Raw barcode text:', text);
    console.log('Text length:', text.length);
    console.log('Text type:', typeof text);
    
    // Remove any non-digit characters for initial check
    const digits = text.replace(/\D/g, '');
    console.log('Digits only:', digits);
    console.log('Digits length:', digits.length);
    
    // RELAXED ISBN DETECTION - Accept more possibilities
    
    // 1. Check for 13-digit codes (most common on books)
    if (digits.length === 13) {
      console.log('Found 13-digit code:', digits);
      
      // Standard ISBN-13 (starts with 978 or 979)
      if (digits.startsWith('978') || digits.startsWith('979')) {
        console.log('Standard ISBN-13 format detected');
        if (validateISBN13(digits)) {
          console.log('✅ VALID ISBN-13:', digits);
          return digits;
        } else {
          console.log('❌ Invalid ISBN-13 checksum:', digits);
          // Don't return invalid ISBNs
          return null;
        }
      }
      
      // Non-standard 13-digit starting with other digits - validate anyway
      console.log('13-digit code with non-standard prefix - validating...');
      if (validateISBN13(digits)) {
        console.log('✅ Valid 13-digit code (non-ISBN prefix):', digits);
        return digits;
      }
      console.log('❌ Invalid 13-digit code');
      return null;
    }
    
    // 2. Check for 12-digit codes (UPC-A without check digit)
    if (digits.length === 12) {
      console.log('Found 12-digit UPC-A code:', digits);
      // Try to validate as UPC-A or convert to ISBN-13
      // For now, we'll skip 12-digit codes as they're not standard ISBNs
      console.log('⚠️ 12-digit codes not supported (not standard ISBN)');
      return null;
    }
    
    // 3. Check for 10-digit ISBN
    if (digits.length === 10) {
      console.log('Found 10-digit code:', digits);
      console.log('Original text for ISBN-10 check:', text);
      
      if (validateISBN10(text)) {
        const isbn13 = convertISBN10to13(text);
        console.log('✅ Valid ISBN-10 converted to ISBN-13:', isbn13);
        return isbn13;
      } else {
        console.log('❌ Invalid ISBN-10 checksum');
        // Don't convert invalid ISBN-10s
        return null;
      }
    }

    // 4. Look for embedded ISBN patterns in longer text
    const isbn13Match = text.match(/(?:978|979)\d{10}/);
    if (isbn13Match) {
      console.log('Found embedded ISBN-13 pattern:', isbn13Match[0]);
      if (validateISBN13(isbn13Match[0])) {
        console.log('✅ Valid embedded ISBN-13:', isbn13Match[0]);
        return isbn13Match[0];
      }
    }

    const isbn10Match = text.match(/\d{9}[\dX]/i);
    if (isbn10Match) {
      console.log('Found embedded ISBN-10 pattern:', isbn10Match[0]);
      if (validateISBN10(isbn10Match[0])) {
        const isbn13 = convertISBN10to13(isbn10Match[0]);
        console.log('✅ Valid embedded ISBN-10 converted:', isbn13);
        return isbn13;
      }
    }

    // No fallback - only accept valid ISBNs

    console.log('❌ No valid ISBN pattern found in:', text);
    console.log('=== END ISBN EXTRACTION ===');
    return null;
  }, [validateISBN13, validateISBN10, convertISBN10to13]);

  // Stop scanning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopScanning = useCallback(() => {
    console.log('Stopping scanner...');
    
    // Clear manual scan interval if it exists
    if (videoRef.current && (videoRef.current as any)._scanInterval) {
      clearInterval((videoRef.current as any)._scanInterval);
      (videoRef.current as any)._scanInterval = null;
      console.log('Cleared manual scan interval');
    }
    
    if (scannerRef.current) {
      scannerRef.current.reset();
      console.log('Reset ZXing scanner');
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      console.log('Stopped camera stream');
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    console.log('Scanner stopped');
  }, []);

  // Handle scan result - use refs for stable dependencies
  const handleScanResult = useCallback((result: Result) => {
    const text = result.getText();
    const now = Date.now();
    
    // Update detection statistics
    setDetectionCount(prev => prev + 1);
    setLastDetectionTime(now);
    setLastDetectedCode(text);
    
    console.log(`Barcode detected:`, text);
    
    // Play beep sound for ANY detected barcode
    playBeep();
    
    // Show visual flash feedback
    setShowDetectionFlash(true);
    setTimeout(() => setShowDetectionFlash(false), 300);
    
    // Enhanced toast with detection info
    showToast(`📷 Barcode: ${text}`, 'info');
    
    // Validate ISBN
    const isbn = extractISBN(text);
    console.log('Extracted ISBN:', isbn);
    
    if (isbn) {
      setLastScannedISBN(prevLastISBN => {
        if (isbn !== prevLastISBN) {
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
          setScannedISBNs(prevScannedISBNs => {
            if (prevScannedISBNs.includes(isbn)) {
              // Duplicate
              setDuplicateCount(prev => prev + 1);
              showToast(`Duplicate ISBN: ${isbn}`, 'warning');
              return prevScannedISBNs;
            } else {
              // Add to batch
              showToast(`ISBN scanned: ${isbn} (${prevScannedISBNs.length + 1} total)`, 'success');
              recordScan();
              return [...prevScannedISBNs, isbn];
            }
          });
          
          return isbn;
        }
        return prevLastISBN;
      });
    } else {
      // Show toast for non-ISBN barcodes for debugging
      showToast(`Non-ISBN barcode: ${text}`, 'warning');
    }
  }, [showToast, extractISBN, batchId, playBeep]); // Removed changing state dependencies

  // Create stable refs to avoid dependency issues
  const getStreamRef = useRef(getStream);
  const showToastRef = useRef(showToast);
  const handleScanResultRef = useRef(handleScanResult);
  
  // Update refs when functions change
  useEffect(() => {
    getStreamRef.current = getStream;
  }, [getStream]);
  
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);
  
  useEffect(() => {
    handleScanResultRef.current = handleScanResult;
  }, [handleScanResult]);

  // Start scanning - use refs to avoid dependency cycles
  const startScanning = useCallback(async () => {
    if (!videoRef.current || !scannerRef.current) return;
    
    // Prevent multiple camera access attempts
    if (activeStreamRef.current) {
      console.log('Camera stream already active, skipping new request');
      return;
    }

    try {
      setIsScanning(true);
      
      // Get camera stream with optimized settings for barcode scanning
      console.log('Requesting camera stream with enhanced settings...');
      const stream = await getStreamRef.current({
        video: {
          facingMode: 'environment',  // Use back camera
          width: { ideal: 1920, min: 1280 },   // Higher resolution for better barcode reading
          height: { ideal: 1080, min: 720 },   // Higher resolution
          frameRate: { ideal: 30, min: 15 },   // Smooth scanning
          // Focus settings for close-up barcode scanning
          focusMode: { ideal: 'continuous' },
          resizeMode: { ideal: 'crop-and-scale' }
        } as any  // Type assertion for newer camera features
      });
      console.log('Enhanced camera stream obtained:', stream);
      
      streamRef.current = stream;
      activeStreamRef.current = stream; // Track active stream to prevent duplicates
      videoRef.current.srcObject = stream;
      
      // Add video event listeners for debugging (only if not already added)
      if (!(videoRef.current as any)._listenersAdded) {
        videoRef.current.addEventListener('loadstart', () => console.log('Video: loadstart'));
        videoRef.current.addEventListener('loadedmetadata', () => console.log('Video: loadedmetadata'));
        videoRef.current.addEventListener('loadeddata', () => console.log('Video: loadeddata'));
        videoRef.current.addEventListener('canplay', () => console.log('Video: canplay'));
        videoRef.current.addEventListener('canplaythrough', () => console.log('Video: canplaythrough'));
        videoRef.current.addEventListener('play', () => console.log('Video: play'));
        videoRef.current.addEventListener('playing', () => console.log('Video: playing'));
        videoRef.current.addEventListener('pause', () => console.log('Video: pause'));
        videoRef.current.addEventListener('ended', () => console.log('Video: ended'));
        videoRef.current.addEventListener('error', (e) => console.error('Video error:', e));
        videoRef.current.addEventListener('stalled', () => console.log('Video: stalled'));
        videoRef.current.addEventListener('suspend', () => console.log('Video: suspend'));
        videoRef.current.addEventListener('waiting', () => console.log('Video: waiting'));
        (videoRef.current as any)._listenersAdded = true;
      }

      // Start optimized continuous scanning with better error handling
      const startDecoding = () => {
        console.log('🚀 Starting optimized barcode detection...');
        
        // Method 1: Use ZXing's continuous decode mode with proper error handling
        try {
          console.log('📹 Attempting ZXing continuous decode...');
          scannerRef.current?.decodeFromVideoDevice(
            selectedDeviceId || undefined,
            videoRef.current,
            (result, error) => {
              if (result) {
                console.log('✅ ZXing continuous result:', result.getText());
                handleScanResultRef.current(result);
              }
              if (error) {
                // Only log non-routine errors
                if (error.name !== 'NotFoundException') {
                  console.log('⚠️ ZXing decode error:', error.name, error.message);
                }
              }
            }
          );
          console.log('✅ ZXing continuous decode started successfully');
        } catch (error) {
          console.error('❌ ZXing continuous decode failed:', error);
          showToastRef.current('Continuous scanning failed, using manual mode', 'warning');
        }
        
        // Method 2: Enhanced manual scanning interval as backup with better timing
        const manualScanInterval = setInterval(async () => {
          if (!scannerRef.current || !videoRef.current) {
            clearInterval(manualScanInterval);
            return;
          }
          
          try {
            // Try to decode current video frame with better error handling
            const result = await scannerRef.current.decodeFromVideoElement(videoRef.current);
            if (result) {
              console.log('🎯 Manual interval result:', result.getText());
              handleScanResultRef.current(result);
            }
          } catch (error) {
            // Silent fail for manual scanning - this is expected when no barcode present
            // Only log unexpected errors
            if ((error as Error)?.name !== 'NotFoundException') {
              console.log('🔄 Scanning...', (error as Error)?.name);
            }
          }
        }, 200); // Slightly slower interval to reduce CPU usage while maintaining responsiveness
        
        // Store interval ID for cleanup
        (videoRef.current as any)._scanInterval = manualScanInterval;
        
        console.log('🔄 Manual backup scanning interval started');
      };

      // Ensure video plays and is ready for scanning
      const ensureVideoPlaying = async () => {
        if (videoRef.current) {
          try {
            console.log('Attempting to play video...');
            await videoRef.current.play();
            console.log('Video playing successfully');
            startDecoding();
          } catch (error) {
            console.error('Failed to play video:', error);
            // Try starting decoding anyway
            startDecoding();
          }
        }
      };

      // Wait for video to be ready
      if (videoRef.current?.readyState >= 3) { // HAVE_FUTURE_DATA or better
        ensureVideoPlaying();
      } else {
        videoRef.current?.addEventListener('canplay', ensureVideoPlaying, { once: true });
      }

      // Check torch support
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      if (capabilities && 'torch' in capabilities) {
        setTorchEnabled(true);
      }
    } catch (error) {
      console.error('Failed to start scanning:', error);
      showToastRef.current('Failed to start camera', 'error');
      setIsScanning(false);
      // Clear refs on error to allow retry
      activeStreamRef.current = null;
      initializationRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies - use refs instead

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

  // Single initialization flag to prevent multiple camera access
  const initializationRef = useRef(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  
  // Request permission and start scanning - prevent multiple initializations
  useEffect(() => {
    console.log('Scanner effect triggered:', { permissionState, isScanning, initialized: initializationRef.current });
    
    // Only start if we have permission, aren't scanning, and haven't initialized yet
    if (permissionState === 'granted' && !isScanning && !initializationRef.current) {
      console.log('Starting scanning due to permission granted and not currently scanning');
      initializationRef.current = true;
      
      // Use a timeout to break the potential synchronous cycle
      setTimeout(() => {
        startScanning();
      }, 100); // Slightly longer delay to ensure DOM is ready
    }
  }, [permissionState, isScanning, startScanning]); // Keep startScanning but prevent multiple inits

  // Cleanup on unmount - remove stopScanning dependency to prevent re-renders
  useEffect(() => {
    return () => {
      console.log('BarcodeScanner unmounting, stopping scanner...');
      // Call stopScanning directly without dependency to avoid re-renders
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Clear refs to prevent reuse
      activeStreamRef.current = null;
      initializationRef.current = false;
    };
  }, []); // Empty dependency array for cleanup only on unmount

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
    <div className="fixed inset-0 bg-booktarr-bg z-50 flex flex-col overflow-hidden max-h-screen">
      {/* Header */}
      <div className="bg-booktarr-surface border-b border-booktarr-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-booktarr-text">
              Scan ISBN Barcodes
            </h2>
            <p className="text-sm text-booktarr-textSecondary">
              📚 {scannedISBNs.length} ISBNs found | Status: {permissionState} | 📷 {isScanning ? 'Scanning...' : 'Stopped'} | 🎯 {detectionCount} detections | ⚠️ {duplicateCount} duplicates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-booktarr-textMuted hover:text-booktarr-text hover:bg-booktarr-surface2 rounded-lg transition-colors"
            title="Close Scanner"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative bg-black min-h-0 w-full">
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
              style={{ minHeight: '300px' }}
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black bg-opacity-40" />
              
              {/* Detection flash effect */}
              {showDetectionFlash && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-30 animate-pulse" />
              )}
              
              {/* Responsive scanning area for better detection */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-md h-48 sm:h-56 lg:h-64">
                <div className="relative w-full h-full">
                  {/* Main scanning frame */}
                  <div className="absolute inset-0 border-2 border-booktarr-accent rounded-lg" />
                  
                  {/* Corner indicators */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-booktarr-accent rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-booktarr-accent rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-booktarr-accent rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-booktarr-accent rounded-br-lg" />
                  
                  {/* Multiple scanning lines for better detection */}
                  <div className="absolute inset-x-0 h-0.5 bg-booktarr-accent animate-pulse" 
                       style={{ top: '30%' }} />
                  <div className="absolute inset-x-0 h-0.5 bg-booktarr-accent animate-pulse" 
                       style={{ top: '50%', animationDelay: '0.5s' }} />
                  <div className="absolute inset-x-0 h-0.5 bg-booktarr-accent animate-pulse" 
                       style={{ top: '70%', animationDelay: '1s' }} />
                  
                  {/* Center crosshair */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-6 h-0.5 bg-booktarr-accent"></div>
                    <div className="w-0.5 h-6 bg-booktarr-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced instructions */}
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <div className="bg-black bg-opacity-70 inline-block px-6 py-3 rounded-lg">
                  <p className="text-white text-sm font-medium">📚 Scan ISBN Barcode on Book</p>
                  <p className="text-white text-xs mt-1">Look for barcode with "ISBN" text - usually on back cover</p>
                  <p className="text-yellow-300 text-xs mt-1">✨ Tip: Hold steady, ensure good lighting</p>
                  {lastDetectedCode && (
                    <p className="text-green-300 text-xs mt-2">Last detected: {lastDetectedCode}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-booktarr-surface border-t border-booktarr-border p-3 sm:p-4 flex-shrink-0 w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4">
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
          <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
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
            
            {/* Manual capture button - larger and more prominent */}
            <button
              onClick={async () => {
                console.log('📸 Manual capture initiated');
                
                // Enhanced validation checks
                if (!scannerRef.current) {
                  showToast('❌ Scanner not initialized - try refreshing', 'error');
                  return;
                }
                
                if (!videoRef.current) {
                  showToast('❌ Camera not ready - check permissions', 'error');
                  return;
                }
                
                if (videoRef.current.readyState < 3) {
                  showToast('❌ Camera loading - please wait', 'warning');
                  return;
                }
                
                // Enhanced visual feedback with longer duration
                setShowDetectionFlash(true);
                setTimeout(() => setShowDetectionFlash(false), 500);
                
                // Play capture sound for immediate feedback
                try {
                  playBeep();
                } catch (error) {
                  console.log('Audio feedback failed:', error);
                }
                
                try {
                  // Show immediate feedback
                  showToast('📸 Analyzing frame for barcodes...', 'info');
                  
                  // Attempt capture with timeout
                  const capturePromise = scannerRef.current.decodeFromVideoElement(videoRef.current);
                  const timeoutPromise = new Promise<null>((_, reject) =>
                    setTimeout(() => reject(new Error('Capture timeout')), 5000)
                  );
                  
                  const result = await Promise.race([capturePromise, timeoutPromise]);
                  
                  if (result) {
                    console.log('✅ Manual capture successful:', result.getText());
                    showToast(`🎯 Found barcode: ${result.getText()}`, 'success');
                    handleScanResultRef.current(result);
                  } else {
                    console.log('❌ Manual capture - no barcode detected');
                    showToast('❌ No barcode found - ensure barcode is clearly visible and try again', 'warning');
                  }
                } catch (error: any) {
                  console.error('❌ Manual capture error:', error);
                  
                  let errorMessage = '❌ Manual capture failed - ';
                  if (error.message === 'Capture timeout') {
                    errorMessage += 'operation timed out';
                  } else if (error.name === 'NotFoundException') {
                    errorMessage += 'no barcode detected in frame';
                  } else if (error.name === 'ChecksumException') {
                    errorMessage += 'barcode damaged or unclear';
                  } else if (error.name === 'FormatException') {
                    errorMessage += 'unsupported barcode format';
                  } else {
                    errorMessage += 'please try again';
                  }
                  
                  showToast(errorMessage, 'error');
                }
              }}
              className="px-3 py-2 bg-booktarr-accent rounded-lg hover:bg-booktarr-accentHover transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Capture current frame and analyze for barcodes"
              disabled={!isScanning || permissionState !== 'granted'}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-white text-sm font-medium hidden sm:inline">📸 Capture</span>
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

        {/* Book scanning tips */}
        {detectionCount > 0 && scannedISBNs.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded-lg">
            <h4 className="text-yellow-300 text-sm font-semibold mb-2">
              📖 Detected {detectionCount} barcodes but no ISBNs - Try these tips:
            </h4>
            <ul className="text-yellow-200 text-xs space-y-1">
              <li>• Look for barcode with "ISBN" text printed nearby</li>
              <li>• Try the back cover of the book (most common location)</li>
              <li>• Ensure barcode has 10 or 13 digits</li>
              <li>• Product barcodes (like "A4A") are not book ISBNs</li>
              <li>• Try different books if this one doesn't have an ISBN</li>
            </ul>
          </div>
        )}

        {/* Scanned ISBNs list */}
        {scannedISBNs.length > 0 && (
          <div className="mt-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 space-y-1 sm:space-y-0">
              <h4 className="text-sm font-semibold text-booktarr-text">
                Scanned ISBNs ({scannedISBNs.length})
              </h4>
              {duplicateCount > 0 && (
                <span className="text-xs text-booktarr-warning">
                  {duplicateCount} duplicates ignored
                </span>
              )}
            </div>
            <div className="max-h-32 sm:max-h-40 overflow-y-auto bg-booktarr-surface2 rounded-lg">
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