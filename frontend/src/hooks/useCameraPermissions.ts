/**
 * Camera permissions hook
 * Handles camera access permissions and device enumeration
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
}

interface CameraPermissionsState {
  permissionState: PermissionState;
  isSupported: boolean;
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  error: string | null;
}

export const useCameraPermissions = () => {
  const [state, setState] = useState<CameraPermissionsState>({
    permissionState: 'checking',
    isSupported: false,
    devices: [],
    selectedDeviceId: null,
    error: null,
  });
  
  // Use ref to track current state to avoid dependency cycles
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Check if camera is supported
  useEffect(() => {
    const checkSupport = () => {
      const isSupported = !!(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof navigator.mediaDevices.enumerateDevices === 'function'
      );

      setState(prev => ({ ...prev, isSupported }));

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
        setState(prev => ({
          ...prev,
          permissionState: 'granted',
          devices: videoDevices as CameraDevice[],
          selectedDeviceId: videoDevices[0]?.deviceId || null,
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

  return {
    ...state,
    requestPermission,
    selectDevice,
    getStream,
    checkPermission,
  };
};

export default useCameraPermissions;