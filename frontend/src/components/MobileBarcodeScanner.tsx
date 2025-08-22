/**
 * Mobile-optimized Barcode Scanner Component
 * Designed specifically for mobile devices with touch interfaces
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, Result, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { useCameraPermissions } from '../hooks/useCameraPermissions';
import { useAppContext } from '../context/AppContext';

interface MobileBarcodeScannerProps {
  onISBNScanned: (isbn: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({ 
  onISBNScanned, 
  onClose,
  isOpen
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { showToast } = useAppContext();
  const { 
    permissionState, 
    isSupported, 
    devices, 
    selectedDeviceId,
    requestPermission,
    selectDevice 
  } = useCameraPermissions();

  const [isScanning, setIsScanning] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [captureMode, setCaptureMode] = useState<'auto' | 'manual'>('auto');
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize scanner with mobile-optimized settings
  const initializeScanner = useCallback(() => {
    if (!scannerRef.current) {
      const codeReader = new BrowserMultiFormatReader();
      
      // Configure for mobile performance
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.PURE_BARCODE, false);
      
      // Note: setHints is not available in newer ZXing versions
      // Hints are passed to decode methods instead
      scannerRef.current = codeReader;
    }
  }, []);

  // Start camera with mobile constraints
  const startCamera = useCallback(async () => {
    if (!videoRef.current || !isSupported) return;

    try {
      setIsScanning(true);
      
      // Mobile-optimized camera constraints
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          facingMode: { ideal: 'environment' }, // Back camera preferred
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
          // Note: focusMode, exposureMode, whiteBalanceMode are not standard MediaTrackConstraints
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        const video = videoRef.current!;
        const handleLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          resolve();
        };
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      });

      // Enable torch if supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities && 'torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: flashEnabled } as any]
        });
      }

      startScanning();
      
    } catch (error) {
      console.error('Failed to start camera:', error);
      showToast('Failed to access camera. Please check permissions.', 'error');
      setIsScanning(false);
    }
  }, [selectedDeviceId, isSupported, flashEnabled, showToast]);

  // Enhanced scanning with better detection
  const startScanning = useCallback(() => {
    if (!scannerRef.current || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const video = videoRef.current;

    const scanFrame = async () => {
      if (!isScanning || isProcessing) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          // Set canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw current frame
          context?.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Create scan region (center 80% of frame)
          const scanRegion = {
            x: Math.floor(canvas.width * 0.1),
            y: Math.floor(canvas.height * 0.2),
            width: Math.floor(canvas.width * 0.8),
            height: Math.floor(canvas.height * 0.6)
          };

          // Get image data from scan region
          const imageData = context?.getImageData(
            scanRegion.x, 
            scanRegion.y, 
            scanRegion.width, 
            scanRegion.height
          );

          if (imageData) {
            setIsProcessing(true);
            
            try {
              // Create temporary canvas for decoding
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = imageData.width;
              tempCanvas.height = imageData.height;
              const tempContext = tempCanvas.getContext('2d')!;
              tempContext.putImageData(imageData, 0, 0);
              
              const result = await scannerRef.current!.decodeFromVideo(tempCanvas as any);
              if (result && result.getText()) {
                handleBarcodeDetection(result.getText());
              }
            } catch (e) {
              // No barcode found in this frame - continue scanning
            } finally {
              setIsProcessing(false);
            }
          }
        }
      } catch (error) {
        console.error('Scanning error:', error);
      }

      if (captureMode === 'auto') {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    if (captureMode === 'auto') {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }
  }, [isScanning, isProcessing, captureMode]);

  // Handle barcode detection with validation
  const handleBarcodeDetection = useCallback((code: string) => {
    // Validate ISBN format
    const cleanCode = code.replace(/[-\s]/g, '');
    const isValidISBN = /^(97[89])?\d{9}[\dX]$/.test(cleanCode) || /^\d{9}[\dX]$/.test(cleanCode);
    
    if (!isValidISBN) return;

    // Convert to ISBN-13 if needed
    let isbn13 = cleanCode;
    if (cleanCode.length === 10) {
      // Convert ISBN-10 to ISBN-13
      const isbn10 = cleanCode.slice(0, 9);
      let checksum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = i < 3 ? parseInt('978'[i]) : parseInt(isbn10[i - 3]);
        checksum += digit * (i % 2 === 0 ? 1 : 3);
      }
      const checksumDigit = (10 - (checksum % 10)) % 10;
      isbn13 = '978' + isbn10 + checksumDigit;
    }

    // Check for recent duplicates
    if (recentScans.includes(isbn13)) {
      showToast('ISBN already scanned in this session', 'warning');
      return;
    }

    // Add to recent scans
    setRecentScans(prev => [...prev.slice(-9), isbn13]);
    
    // Visual feedback
    navigator.vibrate?.(200);
    showToast(`ISBN detected: ${isbn13}`, 'success');
    
    // Call parent handler
    onISBNScanned(isbn13);
    
    // Auto-close after successful scan (optional)
    setTimeout(() => {
      onClose();
    }, 1500);
    
  }, [recentScans, showToast, onISBNScanned, onClose]);

  // Manual capture
  const captureManual = useCallback(async () => {
    if (!scannerRef.current || !videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);
      
      const result = await scannerRef.current.decodeFromVideo(canvas as any);
      if (result) {
        handleBarcodeDetection(result.getText());
      } else {
        showToast('No barcode detected. Try adjusting position.', 'warning');
      }
    } catch (error) {
      showToast('Failed to detect barcode. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [handleBarcodeDetection, showToast]);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      
      if (capabilities && 'torch' in capabilities) {
        const newFlashState = !flashEnabled;
        await track.applyConstraints({
          advanced: [{ torch: newFlashState } as any]
        });
        setFlashEnabled(newFlashState);
      } else {
        showToast('Flash not supported on this device', 'warning');
      }
    } catch (error) {
      showToast('Failed to toggle flash', 'error');
    }
  }, [flashEnabled, showToast]);

  // Switch camera
  const switchCamera = useCallback(() => {
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    
    if (nextDevice) {
      selectDevice(nextDevice.deviceId);
      // Camera will restart automatically due to useEffect
    }
  }, [devices, selectedDeviceId, selectDevice]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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

  // Initialize on mount
  useEffect(() => {
    if (isOpen) {
      initializeScanner();
      if (permissionState === 'granted') {
        startCamera();
      }
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isOpen, permissionState, initializeScanner, startCamera, cleanup]);

  // Restart camera when device changes
  useEffect(() => {
    if (isOpen && isScanning && selectedDeviceId) {
      cleanup();
      setTimeout(startCamera, 100);
    }
  }, [selectedDeviceId, isOpen, startCamera, cleanup]);

  if (!isOpen) return null;

  // Permission request screen
  if (permissionState !== 'granted') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center text-white p-6">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-xl font-semibold mb-4">Camera Access Required</h2>
          <p className="text-gray-300 mb-6">
            BookTarr needs camera access to scan book barcodes
          </p>
          
          {!isSupported ? (
            <div className="text-red-400">
              Camera not supported on this device
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={requestPermission}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
              >
                Enable Camera
              </button>
              
              <div className="text-sm text-gray-400">
                Your camera feed stays on your device and is never uploaded
              </div>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="mt-6 text-gray-400 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/90 text-white">
        <button
          onClick={onClose}
          className="text-2xl"
        >
          ✕
        </button>
        
        <h1 className="font-semibold">Scan Barcode</h1>
        
        <div className="flex items-center space-x-2">
          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2 bg-white/20 rounded-full"
              title="Switch Camera"
            >
              🔄
            </button>
          )}
          
          <button
            onClick={toggleFlash}
            className={`p-2 rounded-full ${flashEnabled ? 'bg-yellow-500' : 'bg-white/20'}`}
            title="Toggle Flash"
          >
            💡
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Scan overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Scan frame */}
            <div className="w-64 h-40 border-2 border-white/50 rounded-lg relative">
              {/* Corner guides */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
              
              {/* Scanning line animation */}
              {captureMode === 'auto' && (
                <div className="absolute inset-0 overflow-hidden rounded-lg">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                </div>
              )}
            </div>
            
            <div className="text-center mt-4 text-white text-sm">
              Position barcode within the frame
            </div>
          </div>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
              Processing...
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/90 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm">
            Mode: {captureMode === 'auto' ? 'Auto Scan' : 'Manual Capture'}
          </div>
          
          <button
            onClick={() => setCaptureMode(prev => prev === 'auto' ? 'manual' : 'auto')}
            className="px-3 py-1 bg-white/20 rounded text-sm"
          >
            Switch Mode
          </button>
        </div>
        
        {captureMode === 'manual' && (
          <button
            onClick={captureManual}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Capture Barcode'}
          </button>
        )}
        
        {/* Recent scans */}
        {recentScans.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">Recent scans:</div>
            <div className="flex flex-wrap gap-2">
              {recentScans.slice(-3).map((isbn, index) => (
                <div
                  key={index}
                  className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded"
                >
                  {isbn}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />
    </div>
  );
};

export default MobileBarcodeScanner;