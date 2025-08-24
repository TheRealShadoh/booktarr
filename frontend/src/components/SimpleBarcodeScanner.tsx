/**
 * Simple Barcode Scanner - Focused on reliability over features
 * Uses a straightforward approach to get camera working quickly
 */
import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, Result } from '@zxing/library';
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
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(null);
  const [showISBNModal, setShowISBNModal] = useState(false);
  const [manualISBN, setManualISBN] = useState('');
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

        // Request camera permission with enhanced constraints for barcode scanning
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // Try to use back camera, fallback to any
            width: { ideal: 1920, min: 1280 }, // Higher resolution for better barcode reading
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 15 }, // Smooth video for scanning
            focusMode: { ideal: 'continuous' }, // Keep focusing for sharp barcodes
            exposureMode: { ideal: 'continuous' }, // Adjust exposure automatically
          } as any // Type assertion for newer camera features
        });

        console.log('Camera permission granted, stream obtained');
        setPermissionStatus('granted');
        setCurrentStream(stream);

        if (videoRef.current) {
          console.log('Setting stream to video element...', {
            streamActive: stream.active,
            streamTracks: stream.getTracks().length,
            videoTracks: stream.getVideoTracks().length
          });
          
          videoRef.current.srcObject = stream;
          
          // Force video element properties
          videoRef.current.autoplay = true;
          videoRef.current.playsInline = true;
          videoRef.current.muted = true; // Required for autoplay in many browsers
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded!', {
              readyState: videoRef.current?.readyState,
              videoWidth: videoRef.current?.videoWidth,
              videoHeight: videoRef.current?.videoHeight
            });
            setCameraReady(true);
          };
          
          videoRef.current.oncanplay = () => {
            console.log('✅ Video can play!', {
              readyState: videoRef.current?.readyState,
              paused: videoRef.current?.paused
            });
            
            // Force play immediately
            const playPromise = videoRef.current?.play();
            if (playPromise) {
              playPromise.then(() => {
                console.log('✅ Video playing successfully!', {
                  readyState: videoRef.current?.readyState,
                  paused: videoRef.current?.paused,
                  currentTime: videoRef.current?.currentTime
                });
              }).catch(err => {
                console.error('❌ Failed to play video:', err);
              });
            }
          };
          
          // Add error handling
          videoRef.current.onloadstart = () => {
            console.log('📡 Video load started');
          };
          
          videoRef.current.onprogress = () => {
            console.log('📊 Video loading progress');
          };
          
          videoRef.current.onstalled = () => {
            console.error('⚠️ Video stalled');
          };
          
          // Force a load after setting srcObject
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState === 0) {
              console.log('🔄 Video still at readyState 0, forcing load...');
              videoRef.current.load();
            }
          }, 1000);
          
          // Add more diagnostic event listeners
          videoRef.current.addEventListener('loadstart', () => {
            console.log('Video load started:', videoRef.current?.readyState);
          });
          
          videoRef.current.addEventListener('loadeddata', () => {
            console.log('Video data loaded:', videoRef.current?.readyState);
          });
          
          videoRef.current.onerror = (error) => {
            console.error('Video error:', error);
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
        // Ensure video is playing and ready - be very permissive
        if (videoRef.current.paused) {
          console.log('Video is paused, waiting...');
          setTimeout(scanFrame, 200);
          return;
        }
        
        // Only check if video has any data at all (readyState 0 = no data)
        if (videoRef.current.readyState === 0) {
          console.log('Video has no data, waiting... readyState:', videoRef.current.readyState);
          setTimeout(scanFrame, 200);
          return;
        }
        
        // Additional check: ensure video has dimensions
        if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
          console.log('Video dimensions not available, waiting... width:', videoRef.current.videoWidth, 'height:', videoRef.current.videoHeight);
          setTimeout(scanFrame, 300);
          return;
        }

        console.log('Attempting to decode from video...', {
          readyState: videoRef.current.readyState,
          paused: videoRef.current.paused,
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          currentTime: videoRef.current.currentTime
        });
        const result = await codeReaderRef.current.decodeFromVideoElement(videoRef.current);
        
        if (result) {
          const text = result.getText();
          console.log('🎯 Barcode detected:', text);
          
          // Enhanced ISBN extraction
          const isbn = extractISBN(text);
          console.log('📚 Extracted ISBN:', isbn);
          
          if (isbn) {
            setScannedISBNs(prev => {
              if (!prev.includes(isbn)) {
                showToast(`📚 ISBN Found: ${isbn}`, 'success');
                playBeep();
                console.log('✅ Added to list:', isbn);
                return [...prev, isbn];
              } else {
                console.log('⚠️ Duplicate ISBN ignored:', isbn);
                showToast('📚 Already scanned this ISBN', 'info');
                return prev;
              }
            });
          } else {
            console.log('ℹ️ Not an ISBN, raw text:', text);
            // Only show non-ISBN detection occasionally to avoid spam
            if (Math.random() > 0.8) { // 20% chance to show
              showToast(`📷 Detected: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`, 'info');
            }
          }
        }
      } catch (err) {
        if (err instanceof NotFoundException) {
          // No barcode found in this frame, continue scanning silently
        } else {
          console.error('⚠️ Scan error:', err);
          // Don't show error toast for every scan failure, only occasionally
          if (Math.random() > 0.95) { // 5% chance to show
            showToast('Scanning... Point camera at barcode', 'info');
          }
        }
      }

      // Continue scanning with adaptive interval
      if (scanning) {
        // Faster scanning when we're detecting things
        const interval = scannedISBNs.length > 0 ? 50 : 150; // 50ms if found ISBNs, 150ms otherwise
        setTimeout(scanFrame, interval);
      }
    };

    console.log('Starting continuous scan...');
    scanFrame();

    return () => {
      console.log('Stopping scan...');
      scanning = false;
      setIsScanning(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, showToast]); // Intentionally omitting extractISBN and scannedISBNs.length to prevent infinite re-renders

  // Extract ISBN from barcode text
  const extractISBN = (text: string): string | null => {
    console.log('=== SimpleBarcodeScanner ISBN EXTRACTION ===');
    console.log('Raw barcode text:', text);
    
    const digits = text.replace(/\D/g, '');
    console.log('Digits only:', digits, 'length:', digits.length);
    
    // Handle 13-digit ISBNs (most common)
    if (digits.length === 13 && (digits.startsWith('978') || digits.startsWith('979'))) {
      console.log('✅ Valid 13-digit ISBN:', digits);
      return digits;
    }
    
    // Handle 10-digit ISBNs - convert to 13-digit with proper check digit calculation
    if (digits.length === 10) {
      console.log('Found 10-digit ISBN, validating:', digits);
      if (validateISBN10(digits)) {
        const isbn13 = convertISBN10to13(digits);
        console.log('✅ Valid ISBN-10 converted to ISBN-13:', isbn13);
        return isbn13;
      } else {
        console.log('❌ Invalid ISBN-10 checksum:', digits);
        return null;
      }
    }
    
    // Handle 10-character ISBNs with possible 'X' check digit
    if (text.replace(/[^\dX]/gi, '').length === 10) {
      const isbn10 = text.replace(/[^\dX]/gi, '');
      console.log('Found 10-character ISBN with possible X, validating:', isbn10);
      if (validateISBN10(isbn10)) {
        const isbn13 = convertISBN10to13(isbn10);
        console.log('✅ Valid ISBN-10 (with X) converted to ISBN-13:', isbn13);
        return isbn13;
      } else {
        console.log('❌ Invalid ISBN-10 checksum (with X):', isbn10);
        return null;
      }
    }
    
    // Look for embedded 13-digit patterns
    const isbn13Match = text.match(/(?:978|979)\d{10}/);
    if (isbn13Match) {
      console.log('✅ Found embedded ISBN-13 pattern:', isbn13Match[0]);
      return isbn13Match[0];
    }
    
    console.log('❌ No valid ISBN pattern found');
    return null;
  };

  // Validate ISBN-10 checksum
  const validateISBN10 = (isbn: string): boolean => {
    if (isbn.length !== 10) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(isbn[i]) * (10 - i);
    }
    
    const lastChar = isbn[9].toUpperCase();
    const checkDigit = (11 - (sum % 11)) % 11;
    const expectedChar = checkDigit === 10 ? 'X' : checkDigit.toString();
    
    return lastChar === expectedChar;
  };

  // Convert ISBN-10 to ISBN-13 with proper check digit calculation
  const convertISBN10to13 = (isbn10: string): string => {
    const prefix = '978';
    const isbn13WithoutCheck = prefix + isbn10.substring(0, 9);
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(isbn13WithoutCheck[i]) * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return isbn13WithoutCheck + checkDigit;
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
    setShowISBNModal(true);
  };

  const handleISBNSubmit = () => {
    if (manualISBN.trim()) {
      const cleanISBN = extractISBN(manualISBN.trim());
      if (cleanISBN) {
        setScannedISBNs(prev => {
          if (!prev.includes(cleanISBN)) {
            showToast(`✅ Added: ${cleanISBN}`, 'success');
            playBeep();
            setManualISBN('');
            setShowISBNModal(false);
            return [...prev, cleanISBN];
          } else {
            showToast('📚 Already scanned', 'warning');
            setManualISBN('');
            setShowISBNModal(false);
          }
          return prev;
        });
      } else {
        showToast('Invalid ISBN format', 'error');
      }
    }
  };

  const handleISBNCancel = () => {
    setManualISBN('');
    setShowISBNModal(false);
  };

  // Manual focus trigger function
  const triggerFocus = async () => {
    try {
      if (!currentStream) {
        showToast('❌ No camera stream available', 'error');
        return;
      }

      const videoTrack = currentStream.getVideoTracks()[0];
      if (!videoTrack) {
        showToast('❌ No video track found', 'error');
        return;
      }

      // Check if focus control is supported
      const capabilities = videoTrack.getCapabilities() as any;
      console.log('📸 Camera capabilities:', capabilities);

      if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
        // Apply manual focus constraints
        await videoTrack.applyConstraints({
          focusMode: 'manual',
          focusDistance: 0.5 // Focus at middle distance, good for barcode scanning
        } as any);
        showToast('🎯 Manual focus applied', 'success');
      } else if (capabilities.focusMode && capabilities.focusMode.includes('single-shot')) {
        // Trigger single-shot autofocus
        await videoTrack.applyConstraints({
          focusMode: 'single-shot'
        } as any);
        showToast('🎯 Auto-focus triggered', 'success');
      } else {
        // Try to restart continuous focus
        await videoTrack.applyConstraints({
          focusMode: 'continuous'
        } as any);
        showToast('🔄 Focus mode refreshed', 'info');
      }

      console.log('✅ Focus applied successfully');
    } catch (error) {
      console.error('Focus error:', error);
      showToast('⚠️ Focus control not supported on this device', 'warning');
    }
  };

  // Add keyboard support (Escape to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('Escape key pressed, closing scanner');
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col h-screen max-h-screen overflow-hidden barcode-scanner-interface" data-testid="barcode-scanner">
      {/* Header */}
      <div className="bg-booktarr-surface p-4 border-b border-booktarr-border">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-booktarr-text">
              Barcode Scanner
            </h2>
            <p className="text-sm text-booktarr-textSecondary" data-testid="scanner-status">
              📚 {scannedISBNs.length} ISBNs found | 
              Status: {permissionStatus} | 
              {isScanning ? '📷 Scanning...' : '⏸️ Not scanning'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-booktarr-surface2 rounded text-booktarr-text min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center"
            data-testid="close-scanner"
            title="Close Scanner"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black min-h-0 overflow-hidden">
        {permissionStatus === 'checking' && (
          <div className="absolute inset-0 flex items-center justify-center" data-testid="camera-permission-checking">
            <div className="text-white text-center">
              <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}

        {permissionStatus === 'denied' && (
          <div className="absolute inset-0 flex items-center justify-center p-4" data-testid="camera-permission-denied">
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
                data-testid="fallback-manual-entry"
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
              className="w-full h-full"
              autoPlay
              playsInline
              muted
              data-testid="camera-video"
              style={{
                minHeight: '400px',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#333',
                zIndex: 1,
                position: 'absolute',
                top: 0,
                left: 0
              }}
              onLoadedMetadata={() => {
                console.log('📺 Video element loaded metadata:', {
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight,
                  readyState: videoRef.current?.readyState,
                  srcObject: !!videoRef.current?.srcObject,
                  style: videoRef.current?.style.cssText
                });
                
                // Force video to be visible
                if (videoRef.current) {
                  videoRef.current.style.display = 'block';
                  videoRef.current.style.visibility = 'visible';
                  console.log('📺 Forced video visibility');
                }
              }}
              onPlay={() => {
                console.log('📺 Video element started playing');
              }}
              onError={(e) => {
                console.error('📺 Video element error:', e);
              }}
            />
            
            {/* Debug info overlay */}
            <div className="absolute top-4 left-4 bg-red-500 text-white p-2 text-xs z-50" style={{ zIndex: 100 }}>
              Video Debug: {videoRef.current?.videoWidth}x{videoRef.current?.videoHeight} | 
              ReadyState: {videoRef.current?.readyState} | 
              Paused: {videoRef.current?.paused ? 'Yes' : 'No'}
            </div>
            
            {/* Scanning overlay - reduced opacity to see video behind */}
            <div className="absolute inset-0 pointer-events-none" data-testid="scanner-overlay" style={{ zIndex: 10 }}>
              <div className="absolute inset-0 bg-black bg-opacity-10" />
              
              {/* Scanning frame */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-40" data-testid="scan-frame">
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
      <div className="bg-booktarr-surface border-t border-booktarr-border p-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
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
          
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <button
              onClick={async () => {
                console.log('📸 Manual capture triggered');
                if (!codeReaderRef.current || !videoRef.current) {
                  showToast('Scanner not ready - please wait for camera to load', 'error');
                  return;
                }
                
                // Store scanning state for later restoration
                const wasScanning = isScanning;
                
                // Debug: Check actual video element state
                console.log('🔍 Manual capture video debug:', {
                  readyState: videoRef.current.readyState,
                  paused: videoRef.current.paused,
                  videoWidth: videoRef.current.videoWidth,
                  videoHeight: videoRef.current.videoHeight,
                  currentTime: videoRef.current.currentTime,
                  srcObject: !!videoRef.current.srcObject
                });
                
                // Check video readiness
                if (videoRef.current.paused) {
                  showToast('Video is paused - click to resume', 'warning');
                  try {
                    await videoRef.current.play();
                  } catch (playError) {
                    showToast('Failed to start video', 'error');
                    return;
                  }
                }
                
                // Skip readiness checks for manual capture since debug shows video is actually ready
                // The video element has a race condition where different functions see different readyState values
                console.log('⚠️ Manual capture: bypassing readiness checks due to race condition');
                console.log('📊 Video appears ready based on debug output above');
                
                // Only block if video genuinely has no dimensions (truly not ready)
                if (videoRef.current.videoWidth === 0 && videoRef.current.videoHeight === 0) {
                  showToast('Video dimensions not available - camera still loading', 'warning');
                  return;
                }
                
                try {
                  showToast('📸 Capturing frame...', 'info');
                  
                  // Temporarily pause continuous scanning to avoid conflicts
                  if (wasScanning) {
                    console.log('⏸️ Pausing continuous scan for manual capture');
                    setIsScanning(false);
                  }
                  
                  // Use canvas capture to avoid ZXing video element race condition
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d')!;
                  
                  // Set canvas size to video dimensions
                  canvas.width = videoRef.current.videoWidth;
                  canvas.height = videoRef.current.videoHeight;
                  
                  // Draw current video frame to canvas
                  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                  console.log('📸 Frame captured to canvas:', canvas.width, 'x', canvas.height);
                  
                  // Canvas is ready for conversion to Image element
                  
                  // Create Image element from canvas data URL for ZXing
                  const dataUrl = canvas.toDataURL('image/png');
                  const img = new Image();
                  
                  const capturePromise = new Promise<Result>((resolve, reject) => {
                    img.onload = async () => {
                      try {
                        const result = await codeReaderRef.current.decodeFromImageElement(img);
                        resolve(result);
                      } catch (error) {
                        reject(error);
                      }
                    };
                    img.onerror = () => reject(new Error('Failed to load canvas image'));
                    img.src = dataUrl;
                  });
                  const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Capture timeout')), 5000)
                  );
                  
                  const result = await Promise.race([capturePromise, timeoutPromise]);
                  
                  if (result) {
                    console.log('Manual capture result:', (result as Result).getText());
                    const text = (result as Result).getText();
                    const isbn = extractISBN(text);
                    
                    if (isbn) {
                      setScannedISBNs(prev => {
                        if (!prev.includes(isbn)) {
                          showToast(`📚 Manual capture: ${isbn}`, 'success');
                          playBeep();
                          return [...prev, isbn];
                        }
                        return prev;
                      });
                    } else {
                      showToast(`📷 Found: ${text} (not ISBN)`, 'warning');
                    }
                  } else {
                    showToast('❌ No barcode detected - try positioning barcode clearly in frame', 'warning');
                  }
                } catch (error) {
                  console.error('Manual capture failed:', error);
                  if (error.message === 'Capture timeout') {
                    showToast('❌ Capture timed out - camera may not be responding', 'error');
                  } else {
                    showToast('❌ Manual capture failed - check camera permissions', 'error');
                  }
                } finally {
                  // Resume continuous scanning if it was active
                  if (wasScanning) {
                    console.log('▶️ Resuming continuous scan after manual capture');
                    setTimeout(() => setIsScanning(true), 100); // Brief delay to avoid conflicts
                  }
                }
              }}
              className="bg-booktarr-accent text-white px-3 py-2 rounded hover:bg-booktarr-accentHover min-h-[44px] min-w-[44px] touch-manipulation"
              title="Capture current camera frame"
              data-testid="capture-button"
            >
              📸 Capture
            </button>
            
            <button
              onClick={triggerFocus}
              className="bg-booktarr-surface2 text-booktarr-text px-3 py-2 rounded hover:bg-booktarr-hover min-h-[44px] min-w-[44px] touch-manipulation"
              title="Focus camera for better barcode scanning"
              data-testid="focus-button"
            >
              🎯 Focus
            </button>

            <button
              onClick={handleManualAdd}
              className="bg-booktarr-surface2 text-booktarr-text px-3 py-2 rounded hover:bg-booktarr-hover min-h-[44px] min-w-[44px] touch-manipulation"
              data-testid="manual-entry"
            >
              Manual Entry
            </button>
            
            {scannedISBNs.length > 0 && (
              <button
                onClick={handleComplete}
                className="bg-booktarr-accent text-white px-4 py-2 rounded hover:bg-booktarr-accentHover min-h-[44px] min-w-[44px] touch-manipulation font-semibold"
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

      {/* Mobile-Friendly ISBN Input Modal */}
      {showISBNModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
          <div className="bg-booktarr-surface border border-booktarr-border rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-booktarr-text mb-4">Enter ISBN</h3>
            <input
              type="text"
              value={manualISBN}
              onChange={(e) => setManualISBN(e.target.value)}
              placeholder="Enter ISBN (10 or 13 digits)"
              className="w-full px-4 py-3 bg-booktarr-surface2 border border-booktarr-border rounded-lg text-booktarr-text placeholder-booktarr-textMuted focus:border-booktarr-accent focus:ring-1 focus:ring-booktarr-accent mb-4"
              style={{ fontSize: '16px' }} // Prevent iOS zoom
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleISBNSubmit();
                } else if (e.key === 'Escape') {
                  handleISBNCancel();
                }
              }}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleISBNCancel}
                className="flex-1 px-4 py-3 bg-booktarr-surface2 text-booktarr-text rounded-lg hover:bg-booktarr-hover min-h-[44px] touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleISBNSubmit}
                className="flex-1 px-4 py-3 bg-booktarr-accent text-white rounded-lg hover:bg-booktarr-accentHover min-h-[44px] touch-manipulation font-semibold"
              >
                Add ISBN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleBarcodeScanner;