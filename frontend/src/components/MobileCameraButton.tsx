/**
 * Prominent mobile camera button component
 * Provides easy access to barcode scanning on mobile devices
 */
import React, { useState, useEffect } from 'react';
import { isTouchDevice } from '../hooks/useSwipeGestures';
import MobileModal from './MobileModal';
import SimpleBarcodeScanner from './SimpleBarcodeScanner';

interface MobileCameraButtonProps {
  onBookAdded?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const MobileCameraButton: React.FC<MobileCameraButtonProps> = ({
  onBookAdded,
  className = "",
  position = 'bottom-right',
  size = 'medium',
  showLabel = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  // Check if device has camera capabilities
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        // Check if device is touch-enabled and supports getUserMedia
        if (isTouchDevice() && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Try to get camera permissions to verify camera exists
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices.some(device => device.kind === 'videoinput');
          
          if (hasVideoInput) {
            setHasCamera(true);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.warn('Camera check failed:', error);
        // Still show button on touch devices even if check fails
        if (isTouchDevice()) {
          setIsVisible(true);
          setHasCamera(true);
        }
      }
    };

    checkCameraSupport();
  }, []);

  const handleScanSuccess = (isbn: string) => {
    console.log('Book scanned:', isbn);
    setIsScannerOpen(false);
    onBookAdded?.();
  };

  const handleScanError = (error: string) => {
    console.error('Scan error:', error);
  };

  const handleOpenScanner = () => {
    setIsScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  // Don't render if not a touch device or no camera
  if (!isVisible || !hasCamera) {
    return null;
  }

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4'
  };

  // Size classes
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-14 h-14',
    large: 'w-16 h-16'
  };

  const iconSizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6',
    large: 'w-7 h-7'
  };

  return (
    <>
      {/* Floating Action Button */}
      <div
        className={`
          fixed z-40 ${positionClasses[position]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        <button
          onClick={handleOpenScanner}
          className="
            group relative w-full h-full
            bg-gradient-to-r from-orange-600 to-orange-500 
            hover:from-orange-500 hover:to-orange-400
            active:from-orange-700 active:to-orange-600
            text-white rounded-full shadow-2xl
            transform transition-all duration-200 ease-out
            hover:scale-110 active:scale-95
            focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-opacity-30
          "
          style={{
            boxShadow: `
              0 8px 32px rgba(249, 115, 22, 0.4),
              0 4px 16px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
          }}
          aria-label="Scan book barcode with camera"
        >
          {/* Camera Icon */}
          <div className="flex items-center justify-center">
            <svg 
              className={`${iconSizeClasses[size]} transition-transform group-hover:scale-110`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
          </div>

          {/* Ripple effect on tap */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-20 transition-opacity duration-150 rounded-full"></div>
          </div>

          {/* Pulse animation to draw attention */}
          <div 
            className="absolute inset-0 rounded-full bg-orange-400 opacity-75 animate-ping"
            style={{ animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite' }}
          />
        </button>

        {/* Optional label */}
        {showLabel && size !== 'small' && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-booktarr-surface border border-booktarr-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <p className="text-xs font-medium text-booktarr-text whitespace-nowrap">
              Scan Barcode
            </p>
            {/* Arrow pointing down */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-booktarr-border"></div>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      <MobileModal
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        title="Scan Book Barcode"
        fullHeight={true}
        preventBodyScroll={true}
      >
        <div className="p-4">
          <SimpleBarcodeScanner
            onComplete={(isbns) => {
              if (isbns && isbns.length > 0) {
                handleScanSuccess(isbns[0]); // Take the first ISBN scanned
              }
            }}
            onClose={handleCloseScanner}
          />
        </div>
      </MobileModal>
    </>
  );
};

export default MobileCameraButton;