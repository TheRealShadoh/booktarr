/**
 * Scanner Wishlist Button Component
 * Integrates barcode scanner with wishlist functionality
 * Allows quick ISBN scanning and adding to wishlist while shopping
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface ScannerWishlistButtonProps {
  onISBNScanned?: (isbn: string) => void;
  onError?: (error: string) => void;
  onAddedToWishlist?: (isbn: string, title?: string) => void;
}

const ScannerWishlistButton: React.FC<ScannerWishlistButtonProps> = ({
  onISBNScanned,
  onError,
  onAddedToWishlist
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedISBN, setScannedISBN] = useState<string | null>(null);
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<{ isbn: string; title?: string; timestamp: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load recent scans from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('booktarr_scanner_wishlist');
    if (stored) {
      try {
        setRecentScans(JSON.parse(stored));
      } catch {
        console.error('Failed to load recent scans');
      }
    }
  }, []);

  // Save recent scans to localStorage
  useEffect(() => {
    localStorage.setItem('booktarr_scanner_wishlist', JSON.stringify(recentScans));
  }, [recentScans]);

  // Cleanup scanner
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setScannedISBN(null);
    setBookInfo(null);

    try {
      readerRef.current = new BrowserMultiFormatReader();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        setIsScanning(true);

        // Start scanning - continuously scan until a code is found
        const scanInterval = setInterval(async () => {
          try {
            const result = await readerRef.current!.decodeFromVideoElement(videoRef.current!);
            if (result) {
              const isbn = result.getText();
              console.log('ISBN Scanned:', isbn);
              setScannedISBN(isbn);
              onISBNScanned?.(isbn);

              // Stop scanning after successful scan
              clearInterval(scanInterval);
              stopScanning();
            }
          } catch (err) {
            // Continue scanning on error
          }
        }, 100);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('Scanner error:', err);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (readerRef.current) {
      readerRef.current.reset();
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const addScannedToWishlist = async (isbn: string) => {
    // Check if ISBN is valid (13 or 10 digits)
    const cleanISBN = isbn.replace(/[^0-9X]/g, '');

    if (cleanISBN.length !== 13 && cleanISBN.length !== 10) {
      setError('Invalid ISBN format. Please try again.');
      return;
    }

    try {
      // Fetch book info to get title
      const response = await fetch(`/api/books/enrich/${cleanISBN}`);
      const data = await response.json();

      const scanRecord = {
        isbn: cleanISBN,
        title: data.title || 'Unknown Title',
        timestamp: Date.now()
      };

      // Add to recent scans
      setRecentScans(prev => [scanRecord, ...prev.slice(0, 9)]);

      // Notify parent component
      onAddedToWishlist?.(cleanISBN, data.title);

      // Show success message
      setBookInfo({
        title: data.title,
        author: data.authors?.[0],
        isbn: cleanISBN
      });

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        setBookInfo(null);
        setScannedISBN(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to fetch book info:', err);
      // Still add to wishlist even if we can't fetch details
      const scanRecord = {
        isbn: cleanISBN,
        timestamp: Date.now()
      };
      setRecentScans(prev => [scanRecord, ...prev.slice(0, 9)]);
      onAddedToWishlist?.(cleanISBN);

      setBookInfo({ isbn: cleanISBN });
      setTimeout(() => {
        setBookInfo(null);
        setScannedISBN(null);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Scanner Button */}
      <div className="text-center">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h4V4H4v2zm10 0h4V4h-4v2zM4 16h4v-2H4v2zm10 0h4v-2h-4v2zM2 4v7h2V4H2zm20 0v7h2V4h-2zM2 13v7h2v-7H2zm20 0v7h2v-7h-2z" />
            </svg>
            Scan ISBN for Wishlist
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition"
          >
            <span className="animate-pulse">●</span>
            Stop Scanning
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Scanner View */}
      {isScanning && (
        <div className="relative bg-black rounded-lg overflow-hidden border-4 border-purple-600">
          <video
            ref={videoRef}
            className="w-full h-auto max-h-96 bg-black"
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-2 border-purple-400 rounded-lg opacity-50"></div>
          </div>
        </div>
      )}

      {/* Scanned Book Info */}
      {bookInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <p className="text-green-800 font-semibold">✓ Added to Wishlist!</p>
          {bookInfo.title && (
            <p className="text-green-700 text-sm">
              <span className="font-medium">{bookInfo.title}</span>
            </p>
          )}
          {bookInfo.author && (
            <p className="text-green-700 text-sm">by {bookInfo.author}</p>
          )}
          <p className="text-green-600 text-xs">ISBN: {bookInfo.isbn}</p>
        </div>
      )}

      {/* Prompt to Add */}
      {scannedISBN && !bookInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <p className="text-blue-900 font-semibold">ISBN Detected: {scannedISBN}</p>
          <button
            onClick={() => addScannedToWishlist(scannedISBN)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Add to Wishlist
          </button>
          <button
            onClick={() => {
              setScannedISBN(null);
              startScanning();
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Scan Another
          </button>
        </div>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm">Recent Scans</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {recentScans.slice(0, 5).map((scan, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{scan.title || scan.isbn}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(scan.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <svg className="w-4 h-4 text-green-600">
                  <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerWishlistButton;
