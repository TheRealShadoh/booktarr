/**
 * Responsive design hook
 * Provides screen size detection and mobile/desktop utilities
 */
import { useState, useEffect, useCallback } from 'react';

interface ScreenSize {
  width: number;
  height: number;
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  devicePixelRatio: number;
}

interface Breakpoints {
  sm: boolean;  // >= 640px
  md: boolean;  // >= 768px
  lg: boolean;  // >= 1024px
  xl: boolean;  // >= 1280px
  '2xl': boolean; // >= 1536px
}

interface ResponsiveState {
  screen: ScreenSize;
  device: DeviceInfo;
  breakpoints: Breakpoints;
}

export const useResponsive = () => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initialize with default values for SSR
    const defaultScreen = { width: 1024, height: 768 };
    const defaultDevice = {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      isLandscape: true,
      isPortrait: false,
      devicePixelRatio: 1,
    };
    const defaultBreakpoints = {
      sm: true,
      md: true,
      lg: true,
      xl: false,
      '2xl': false,
    };

    return {
      screen: defaultScreen,
      device: defaultDevice,
      breakpoints: defaultBreakpoints,
    };
  });

  const updateState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Detect device type
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLandscape = width > height;
    const isPortrait = height >= width;

    // Calculate breakpoints
    const breakpoints: Breakpoints = {
      sm: width >= 640,
      md: width >= 768,
      lg: width >= 1024,
      xl: width >= 1280,
      '2xl': width >= 1536,
    };

    setState({
      screen: { width, height },
      device: {
        isMobile,
        isTablet,
        isDesktop,
        isTouch,
        isLandscape,
        isPortrait,
        devicePixelRatio,
      },
      breakpoints,
    });
  }, []);

  // Listen for window resize and orientation changes
  useEffect(() => {
    updateState();

    const handleResize = () => updateState();
    const handleOrientationChange = () => {
      // Delay to allow orientation change to complete
      setTimeout(updateState, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateState]);

  // Helper functions
  const getResponsiveValue = useCallback(<T>(values: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default: T;
  }): T => {
    if (state.device.isMobile && values.mobile !== undefined) {
      return values.mobile;
    }
    if (state.device.isTablet && values.tablet !== undefined) {
      return values.tablet;
    }
    if (state.device.isDesktop && values.desktop !== undefined) {
      return values.desktop;
    }
    return values.default;
  }, [state.device]);

  const getBreakpointValue = useCallback(<T>(values: {
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
    default: T;
  }): T => {
    // Find the largest matching breakpoint
    if (state.breakpoints['2xl'] && values['2xl'] !== undefined) return values['2xl'];
    if (state.breakpoints.xl && values.xl !== undefined) return values.xl;
    if (state.breakpoints.lg && values.lg !== undefined) return values.lg;
    if (state.breakpoints.md && values.md !== undefined) return values.md;
    if (state.breakpoints.sm && values.sm !== undefined) return values.sm;
    return values.default;
  }, [state.breakpoints]);

  // CSS class helpers
  const getResponsiveClasses = useCallback((classes: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    default?: string;
  }): string => {
    const responsive = getResponsiveValue({
      mobile: classes.mobile,
      tablet: classes.tablet,
      desktop: classes.desktop,
      default: classes.default || '',
    });
    return responsive;
  }, [getResponsiveValue]);

  // Media query helpers
  const matchesMediaQuery = useCallback((query: string): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, []);

  // Safe area helpers for iOS
  const getSafeAreaInsets = useCallback(() => {
    if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
    
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
    };
  }, []);

  // Viewport height helpers (for mobile address bar issues)
  const getViewportHeight = useCallback(() => {
    if (typeof window === 'undefined') return 768;
    
    // Use visual viewport API if available, otherwise fallback to window.innerHeight
    if (window.visualViewport) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }, []);

  // Performance mode for reduced motion
  const prefersReducedMotion = useCallback(() => {
    return matchesMediaQuery('(prefers-reduced-motion: reduce)');
  }, [matchesMediaQuery]);

  // Color scheme preference
  const prefersDarkMode = useCallback(() => {
    return matchesMediaQuery('(prefers-color-scheme: dark)');
  }, [matchesMediaQuery]);

  return {
    ...state,
    getResponsiveValue,
    getBreakpointValue,
    getResponsiveClasses,
    matchesMediaQuery,
    getSafeAreaInsets,
    getViewportHeight,
    prefersReducedMotion,
    prefersDarkMode,
  };
};

export default useResponsive;