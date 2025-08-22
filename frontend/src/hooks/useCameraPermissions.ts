/**
 * Enhanced camera permissions hook
 * Handles camera access permissions, device enumeration, and mobile features
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
  facingMode?: 'user' | 'environment';
  capabilities?: MediaTrackCapabilities;
}

interface CameraCapabilities {
  torch?: boolean;
  zoom?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
}

interface CameraPermissionsState {
  permissionState: PermissionState;
  isSupported: boolean;
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  error: string | null;
  isMobile: boolean;
  capabilities: CameraCapabilities;
}

export const useCameraPermissions = () => {
  const [state, setState] = useState<CameraPermissionsState>({
    permissionState: 'checking',
    isSupported: false,
    devices: [],
    selectedDeviceId: null,
    error: null,
    isMobile: false,
    capabilities: {},
  });
  
  // Use ref to track current state to avoid dependency cycles
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Detect mobile device
  const detectMobile = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    return isMobile;
  }, []);

  // Check if camera is supported
  useEffect(() => {
    const checkSupport = () => {
      const isSupported = !!(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof navigator.mediaDevices.enumerateDevices === 'function'
      );

      const isMobile = detectMobile();

      setState(prev => ({ ...prev, isSupported, isMobile }));

      if (!isSupported) {
        setState(prev => ({
          ...prev,
          permissionState: 'denied',
          error: 'Camera API not supported in this browser',
        }));
      }
    };

    checkSupport();
  }, []);

  // Check permission state
  const checkPermission = useCallback(async () => {
    // Use ref to get current state instead of dependency
    if (!stateRef.current.isSupported) return;

    try {
      // Check if we already have permission by trying to enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // If we can see device labels, we have permission
      const hasPermission = videoDevices.some(device => device.label !== '');
      
      if (hasPermission) {
        const enhancedDevices = await Promise.all(
          videoDevices.map(async (device) => {
            const enhancedDevice: CameraDevice = {
              deviceId: device.deviceId,
              label: device.label,
              kind: device.kind as 'videoinput'
            };

            // Try to determine facing mode from label
            const label = device.label.toLowerCase();
            if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
              enhancedDevice.facingMode = 'environment';
            } else if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
              enhancedDevice.facingMode = 'user';
            }

            // Get device capabilities if possible
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: device.deviceId }
              });
              const track = stream.getVideoTracks()[0];
              enhancedDevice.capabilities = track.getCapabilities?.();
              track.stop();
            } catch (error) {
              // Couldn't get capabilities, continue without them
            }

            return enhancedDevice;
          })
        );

        // Prefer back camera on mobile devices
        const isMobile = stateRef.current.isMobile;
        const backCamera = enhancedDevices.find(d => d.facingMode === 'environment');
        const defaultDevice = isMobile && backCamera ? backCamera : enhancedDevices[0];

        setState(prev => ({
          ...prev,
          permissionState: 'granted',
          devices: enhancedDevices,
          selectedDeviceId: defaultDevice?.deviceId || null,
        }));
      } else {
        // Check if Permission API is available
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setState(prev => ({
              ...prev,
              permissionState: result.state as PermissionState,
            }));

            // Listen for permission changes
            result.addEventListener('change', () => {
              setState(prev => ({
                ...prev,
                permissionState: result.state as PermissionState,
              }));
            });
          } catch (error) {
            // Permission API not available or camera permission not supported
            setState(prev => ({
              ...prev,
              permissionState: 'prompt',
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            permissionState: 'prompt',
          }));
        }
      }
    } catch (error) {
      console.error('Error checking camera permission:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to check camera permission',
      }));
    }
  }, []); // Remove state.isSupported dependency to prevent circular dependency

  // Request camera permission
  const requestPermission = useCallback(async () => {
    if (!stateRef.current.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Camera not supported',
      }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, permissionState: 'checking' }));

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer rear camera
        audio: false,
      });

      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());

      // Now enumerate devices with permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput') as CameraDevice[];

      setState(prev => ({
        ...prev,
        permissionState: 'granted',
        devices: videoDevices,
        selectedDeviceId: videoDevices[0]?.deviceId || null,
        error: null,
      }));

      return true;
    } catch (error: any) {
      console.error('Error requesting camera permission:', error);
      
      let errorMessage = 'Failed to access camera';
      let permissionState: PermissionState = 'denied';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied';
        permissionState = 'denied';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints cannot be satisfied';
      }

      setState(prev => ({
        ...prev,
        permissionState,
        error: errorMessage,
      }));

      return false;
    }
  }, []);

  // Select camera device
  const selectDevice = useCallback((deviceId: string) => {
    setState(prev => ({
      ...prev,
      selectedDeviceId: deviceId,
    }));
  }, []);

  // Get media stream with selected device
  const getStream = useCallback(async (constraints?: MediaStreamConstraints) => {
    const currentState = stateRef.current;
    if (!currentState.isSupported || currentState.permissionState !== 'granted') {
      throw new Error('Camera not available or permission not granted');
    }

    const videoConstraints: MediaTrackConstraints = {
      facingMode: 'environment', // Default to rear camera
      ...constraints?.video as MediaTrackConstraints,
    };

    if (currentState.selectedDeviceId) {
      videoConstraints.deviceId = { exact: currentState.selectedDeviceId };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      return stream;
    } catch (error) {
      console.error('Error getting camera stream:', error);
      throw error;
    }
  }, []);

  // Check permission on mount - separate effect to avoid circular dependency
  useEffect(() => {
    if (state.isSupported) {
      checkPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isSupported]); // Remove checkPermission dependency to prevent circular dependency

  // Mobile-specific utility methods
  const getBackCamera = useCallback(() => {
    return state.devices.find(device => device.facingMode === 'environment');
  }, [state.devices]);

  const getFrontCamera = useCallback(() => {
    return state.devices.find(device => device.facingMode === 'user');
  }, [state.devices]);

  const hasFlash = useCallback(() => {
    const selectedDevice = state.devices.find(d => d.deviceId === state.selectedDeviceId);
    return selectedDevice?.capabilities && 'torch' in selectedDevice.capabilities ? Boolean((selectedDevice.capabilities as any).torch) : false;
  }, [state.devices, state.selectedDeviceId]);

  const hasZoom = useCallback(() => {
    const selectedDevice = state.devices.find(d => d.deviceId === state.selectedDeviceId);
    return selectedDevice?.capabilities && 'zoom' in selectedDevice.capabilities ? Boolean((selectedDevice.capabilities as any).zoom) : false;
  }, [state.devices, state.selectedDeviceId]);

  const switchToBackCamera = useCallback(() => {
    const backCamera = getBackCamera();
    if (backCamera) {
      selectDevice(backCamera.deviceId);
    }
  }, [getBackCamera, selectDevice]);

  const switchToFrontCamera = useCallback(() => {
    const frontCamera = getFrontCamera();
    if (frontCamera) {
      selectDevice(frontCamera.deviceId);
    }
  }, [getFrontCamera, selectDevice]);

  const getOptimalConstraints = useCallback((scanType: 'barcode' | 'document' = 'barcode') => {
    const baseConstraints: MediaTrackConstraints = {
      facingMode: { ideal: 'environment' },
      frameRate: { ideal: 30, max: 30 }
    };

    if (state.isMobile) {
      // Mobile-optimized constraints
      if (scanType === 'barcode') {
        return {
          ...baseConstraints,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          focusMode: 'continuous',
          exposureMode: 'continuous'
        };
      } else {
        // Document scanning needs higher resolution
        return {
          ...baseConstraints,
          width: { ideal: 2560, max: 3840 },
          height: { ideal: 1440, max: 2160 },
          focusMode: 'single-shot'
        };
      }
    } else {
      // Desktop constraints
      return {
        ...baseConstraints,
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 }
      };
    }
  }, [state.isMobile]);

  return {
    ...state,
    requestPermission,
    selectDevice,
    getStream,
    checkPermission,
    // Mobile-specific methods
    getBackCamera,
    getFrontCamera,
    hasFlash,
    hasZoom,
    switchToBackCamera,
    switchToFrontCamera,
    getOptimalConstraints,
  };
};

export default useCameraPermissions;