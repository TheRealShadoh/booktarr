/**
 * Mobile-optimized modal component with slide-up animation
 * Provides better mobile UX compared to traditional desktop modals
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { isTouchDevice } from '../hooks/useSwipeGestures';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  preventBodyScroll?: boolean;
  fullHeight?: boolean;
  className?: string;
}

const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  preventBodyScroll = true,
  fullHeight = false,
  className = ""
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Handle escape key
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle swipe down to close (mobile gesture)
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!isTouchDevice()) return;
    
    startY.current = event.touches[0].clientY;
    currentY.current = startY.current;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isDragging.current) return;
    
    currentY.current = event.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    // Only allow downward dragging to close
    if (deltaY > 0) {
      const modal = modalRef.current;
      if (modal) {
        // Apply transform with resistance
        const resistance = Math.min(deltaY * 0.5, 200);
        modal.style.transform = `translateY(${resistance}px)`;
        modal.style.opacity = String(Math.max(0.5, 1 - resistance / 400));
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    
    const deltaY = currentY.current - startY.current;
    const modal = modalRef.current;
    
    if (modal) {
      if (deltaY > 100) {
        // Close modal if dragged down far enough
        onClose();
      } else {
        // Snap back to original position
        modal.style.transform = 'translateY(0)';
        modal.style.opacity = '1';
      }
    }
    
    isDragging.current = false;
  }, [onClose]);

  // Body scroll prevention
  useEffect(() => {
    if (isOpen && preventBodyScroll) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, preventBodyScroll]);

  // Event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      
      if (isTouchDevice() && modalRef.current) {
        const modal = modalRef.current;
        modal.addEventListener('touchstart', handleTouchStart, { passive: true });
        modal.addEventListener('touchmove', handleTouchMove, { passive: true });
        modal.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        return () => {
          document.removeEventListener('keydown', handleEscapeKey);
          modal.removeEventListener('touchstart', handleTouchStart);
          modal.removeEventListener('touchmove', handleTouchMove);
          modal.removeEventListener('touchend', handleTouchEnd);
        };
      }
      
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, handleEscapeKey, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`
          relative w-full max-w-lg bg-booktarr-surface border-t border-booktarr-border rounded-t-2xl 
          shadow-2xl transform transition-all duration-300 ease-out
          ${fullHeight ? 'h-full rounded-t-none' : 'max-h-[90vh]'}
          ${className}
        `}
        style={{
          animation: isOpen ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-in'
        }}
      >
        {/* Drag indicator for mobile */}
        {isTouchDevice() && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1 bg-booktarr-textMuted rounded-full opacity-30"></div>
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-booktarr-border">
            <h2 className="text-lg font-semibold text-booktarr-text">
              {title || ''}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -m-2 text-booktarr-textSecondary hover:text-booktarr-text transition-colors touch-target"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {children}
        </div>
      </div>
    </div>
  );

  // Render modal in a portal
  return createPortal(modalContent, document.body);
};

// CSS animations for slide up/down effect
const modalStyles = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`;

// Inject styles if they don't exist
if (typeof document !== 'undefined') {
  const styleId = 'mobile-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = modalStyles;
    document.head.appendChild(style);
  }
}

export default MobileModal;