/**
 * Mobile notifications system
 * Provides toast notifications optimized for mobile devices
 */
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { isTouchDevice } from '../hooks/useSwipeGestures';

export interface NotificationConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number; // milliseconds, 0 = manual dismiss
  actionLabel?: string;
  actionCallback?: () => void;
  dismissible?: boolean;
  persistent?: boolean; // survives page navigation
}

interface MobileNotificationsProps {
  position?: 'top' | 'bottom';
  maxNotifications?: number;
  defaultDuration?: number;
}

interface NotificationItemProps {
  notification: NotificationConfig;
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
}

// Global notification manager
class NotificationManager {
  private static instance: NotificationManager;
  private listeners: ((notifications: NotificationConfig[]) => void)[] = [];
  private notifications: NotificationConfig[] = [];

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  subscribe(listener: (notifications: NotificationConfig[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.notifications);
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  show(notification: Omit<NotificationConfig, 'id'>): string {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationConfig = {
      ...notification,
      id,
      duration: notification.duration ?? 5000,
      dismissible: notification.dismissible ?? true
    };

    this.notifications = [...this.notifications, newNotification];
    this.notifyListeners();

    // Auto-dismiss if duration is set
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newNotification.duration);
    }

    return id;
  }

  dismiss(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  dismissAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onDismiss, 
  onAction 
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [translateX, setTranslateX] = useState<number>(0);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  }, [notification.id, onDismiss]);

  const handleAction = useCallback(() => {
    if (notification.actionCallback) {
      notification.actionCallback();
    }
    onAction(notification.id);
  }, [notification, onAction]);

  // Touch handling for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice() || !notification.dismissible) return;
    
    setTouchStartX(e.touches[0].clientX);
    setTouchStartTime(Date.now());
  }, [notification.dismissible]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice() || !notification.dismissible || touchStartX === 0) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    
    // Only allow right swipe (dismiss)
    if (deltaX > 0) {
      setTranslateX(Math.min(deltaX, 100));
    }
  }, [touchStartX, notification.dismissible]);

  const handleTouchEnd = useCallback(() => {
    if (!isTouchDevice() || !notification.dismissible) return;
    
    const touchTime = Date.now() - touchStartTime;
    const swipeThreshold = 50;
    const timeThreshold = 300;
    
    if (translateX > swipeThreshold && touchTime < timeThreshold) {
      handleDismiss();
    } else {
      setTranslateX(0);
    }
    
    setTouchStartX(0);
    setTouchStartTime(0);
  }, [translateX, touchStartTime, handleDismiss, notification.dismissible]);

  // Icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Color classes based on type
  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900 dark:border-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900 dark:border-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:border-yellow-700';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700';
    }
  };

  return (
    <div
      className={`
        relative w-full mb-2 p-4 rounded-xl border shadow-lg
        transform transition-all duration-300 ease-out
        ${getColorClasses()}
        ${isExiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
        ${isTouchDevice() ? 'touch-target' : ''}
      `}
      style={{
        transform: `translateX(${translateX}px) ${isExiting ? 'translateX(100%)' : ''}`
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-booktarr-text">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="text-sm text-booktarr-textSecondary mt-1">
              {notification.message}
            </p>
          )}
          
          {/* Action button */}
          {notification.actionLabel && (
            <button
              onClick={handleAction}
              className="mt-3 text-sm font-medium text-booktarr-accent hover:text-booktarr-accent-dark transition-colors touch-target"
            >
              {notification.actionLabel}
            </button>
          )}
        </div>
        
        {/* Dismiss button */}
        {notification.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 -m-1 text-booktarr-textMuted hover:text-booktarr-text transition-colors touch-target"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Swipe indicator */}
      {isTouchDevice() && notification.dismissible && translateX > 10 && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-booktarr-textMuted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

const MobileNotifications: React.FC<MobileNotificationsProps> = ({
  position = 'top',
  maxNotifications = 5,
  defaultDuration = 5000
}) => {
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);

  useEffect(() => {
    const manager = NotificationManager.getInstance();
    const unsubscribe = manager.subscribe((newNotifications) => {
      // Limit number of visible notifications
      const limited = newNotifications.slice(-maxNotifications);
      setNotifications(limited);
    });

    return unsubscribe;
  }, [maxNotifications]);

  const handleDismiss = useCallback((id: string) => {
    const manager = NotificationManager.getInstance();
    manager.dismiss(id);
  }, []);

  const handleAction = useCallback((id: string) => {
    const manager = NotificationManager.getInstance();
    manager.dismiss(id);
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  const positionClasses = position === 'top' 
    ? 'top-4 left-4 right-4' 
    : 'bottom-4 left-4 right-4';

  const containerContent = (
    <div className={`fixed z-50 ${positionClasses} pointer-events-none`}>
      <div className="pointer-events-auto">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={handleDismiss}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );

  return createPortal(containerContent, document.body);
};

// Hook for using notifications
export const useNotifications = () => {
  const manager = NotificationManager.getInstance();

  const showNotification = useCallback((notification: Omit<NotificationConfig, 'id'>) => {
    return manager.show(notification);
  }, [manager]);

  const dismissNotification = useCallback((id: string) => {
    manager.dismiss(id);
  }, [manager]);

  const dismissAll = useCallback(() => {
    manager.dismissAll();
  }, [manager]);

  // Convenience methods
  const showSuccess = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return showNotification({ ...options, type: 'success', title, message });
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return showNotification({ ...options, type: 'error', title, message });
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return showNotification({ ...options, type: 'warning', title, message });
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string, options?: Partial<NotificationConfig>) => {
    return showNotification({ ...options, type: 'info', title, message });
  }, [showNotification]);

  return {
    showNotification,
    dismissNotification,
    dismissAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default MobileNotifications;