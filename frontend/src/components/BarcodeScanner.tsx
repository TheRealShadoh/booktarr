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
  onScan: (isbn: string) => void;
  onClose: () => void;
  continuous?: boolean;
  batchMode?: boolean;
  onBatchComplete?: (isbns: string[]) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ 
  onScan, 
  onClose,
  continuous = false,
  batchMode = false,
  onBatchComplete 
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
  
  // Batch scanning state
  const [scannedISBNs, setScannedISBNs] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isInBatchMode, setIsInBatchMode] = useState(batchMode);
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Initialize scanner
  useEffect(() => {
    if (!scannerRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);
      
      scannerRef.current = new BrowserMultiFormatReader(hints);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.reset();
      }
    };
  }, []);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      try {
        const newSessionId = await scanHistory.startScanSession(isInBatchMode ? 'batch' : 'single');
        setSessionId(newSessionId);
        
        if (isInBatchMode) {
          const newBatchId = `batch_${Date.now()}`;
          setBatchId(newBatchId);
        }
      } catch (error) {
        console.error('Failed to initialize scan session:', error);
      }
    };

    initSession();
  }, [isInBatchMode]);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        scanHistory.endScanSession(sessionId).catch(console.error);
      }
    };
  }, [sessionId]);

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
    // Remove any non-digit characters
    const digits = text.replace(/\D/g, '');
    
    // Check for ISBN-13
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      if (validateISBN13(digits)) {
        return digits;
      }
    }
    
    // Check for ISBN-10
    if (digits.length === 10) {
      if (validateISBN10(text)) { // Use original text for ISBN-10 (might have X)
        return convertISBN10to13(text);
      }
    }

    // Check if the text contains an ISBN pattern
    const isbn13Match = text.match(/(?:978|979)\d{10}/);
    if (isbn13Match && validateISBN13(isbn13Match[0])) {
      return isbn13Match[0];
    }

    const isbn10Match = text.match(/\d{9}[\dX]/i);
    if (isbn10Match && validateISBN10(isbn10Match[0])) {
      return convertISBN10to13(isbn10Match[0]);
    }

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
    
    // Validate ISBN
    const isbn = extractISBN(text);
    if (isbn && isbn !== lastScannedISBN) {
      setLastScannedISBN(isbn);
      
      // Vibrate if available
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }

      // Record scan in history
      const recordScan = async (success: boolean, error?: string) => {
        try {
          await scanHistory.recordScan(
            isbn,
            'camera',
            success,
            error,
            isInBatchMode ? batchId || undefined : undefined
          );
          
          // Update session stats
          if (sessionId) {
            await scanHistory.updateScanSession(sessionId, {
              totalScans: (await scanHistory.getRecentSessions(1))[0]?.totalScans + 1 || 1,
              successfulScans: success ? ((await scanHistory.getRecentSessions(1))[0]?.successfulScans || 0) + 1 : undefined,
              isbns: isInBatchMode ? scannedISBNs.concat(isbn) : [isbn],
            });
          }
        } catch (error) {
          console.error('Failed to record scan:', error);
        }
      };

      if (isInBatchMode) {
        // Handle batch scanning
        if (scannedISBNs.includes(isbn)) {
          // Duplicate in batch
          setDuplicateCount(prev => prev + 1);
          showToast(`Duplicate ISBN: ${isbn}`, 'warning');
          recordScan(false, 'Duplicate ISBN in batch');
        } else {
          // Add to batch
          setScannedISBNs(prev => [...prev, isbn]);
          showToast(`Added ISBN: ${isbn} (${scannedISBNs.length + 1} scanned)`, 'success');
          recordScan(true);
        }
      } else {
        // Single scan mode
        showToast(`ISBN detected: ${isbn}`, 'success');
        recordScan(true);
        onScan(isbn);

        if (!continuous) {
          stopScanning();
        }
      }
    }
  }, [lastScannedISBN, continuous, onScan, showToast, extractISBN, stopScanning, isInBatchMode, scannedISBNs, batchId, sessionId]);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!videoRef.current || !scannerRef.current) return;

    try {
      setIsScanning(true);
      
      // Get camera stream
      const stream = await getStream({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Start continuous scanning
      scannerRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanResult(result);
          }
          if (error && error.message !== 'NotFoundException') {
            console.error('Scan error:', error);
          }
        }
      );

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
            isInBatchMode ? batchId || undefined : undefined
          );
        } catch (error) {
          console.error('Failed to record manual scan:', error);
        }
      };

      if (isInBatchMode) {
        if (!scannedISBNs.includes(isbn)) {
          setScannedISBNs(prev => [...prev, isbn]);
          showToast(`Added ISBN: ${isbn}`, 'success');
          recordManualScan(true);
        } else {
          showToast('ISBN already in batch', 'warning');
          recordManualScan(false, 'Duplicate ISBN in batch');
        }
      } else {
        recordManualScan(true);
        onScan(isbn);
        if (!continuous) {
          onClose();
        }
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

  // Batch mode functions
  const toggleBatchMode = useCallback(() => {
    setIsInBatchMode(prev => !prev);
    setScannedISBNs([]);
    setDuplicateCount(0);
  }, []);

  const completeBatch = useCallback(() => {
    if (scannedISBNs.length > 0 && onBatchComplete) {
      onBatchComplete(scannedISBNs);
      showToast(`Batch complete: ${scannedISBNs.length} ISBNs`, 'success');
    }
    onClose();
  }, [scannedISBNs, onBatchComplete, onClose, showToast]);

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
    <div className="fixed inset-0 bg-booktarr-bg z-50 flex flex-col">
      {/* Header */}
      <div className="bg-booktarr-surface border-b border-booktarr-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-booktarr-text">
              {isInBatchMode ? 'Batch Scan ISBN Barcodes' : 'Scan ISBN Barcode'}
            </h2>
            {isInBatchMode && (
              <p className="text-sm text-booktarr-textSecondary">
                {scannedISBNs.length} scanned, {duplicateCount} duplicates
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleBatchMode}
              className={`p-2 rounded transition-colors ${
                isInBatchMode 
                  ? 'bg-booktarr-accent text-white' 
                  : 'text-booktarr-textMuted hover:text-booktarr-accent hover:bg-booktarr-surface2'
              }`}
              title={isInBatchMode ? 'Exit batch mode' : 'Enable batch mode'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>
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
      <div className="bg-booktarr-surface border-t border-booktarr-border p-4">
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
            
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="booktarr-btn booktarr-btn-ghost"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Manual Entry
            </button>

            {isInBatchMode && scannedISBNs.length > 0 && (
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
                  onClick={completeBatch}
                  className="booktarr-btn booktarr-btn-primary"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Batch ({scannedISBNs.length})
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

        {/* Last scanned */}
        {lastScannedISBN && continuous && !isInBatchMode && (
          <div className="mt-4 p-3 bg-booktarr-surface2 rounded-lg">
            <p className="text-sm text-booktarr-textSecondary">
              Last scanned: <span className="text-booktarr-text font-mono">{lastScannedISBN}</span>
            </p>
          </div>
        )}

        {/* Batch mode ISBNs list */}
        {isInBatchMode && scannedISBNs.length > 0 && (
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
                    title="Remove from batch"
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