import { useState, useEffect, useCallback } from 'react';

export interface RealLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
  source: 'gps' | 'manual' | 'map-click' | 'ip';
}

export function useRealLocation() {
  const [location, setLocation] = useState<RealLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isPreviewBlocked, setIsPreviewBlocked] = useState(false);

  // Check if we're in Arena preview iframe (geolocation blocked by permissions policy)
  useEffect(() => {
    try {
      // In Arena preview, geolocation is disabled by permissions policy
      // We can detect by checking if we're in an iframe with sandbox
      const isIframe = window.self !== window.top;
      if (isIframe) {
        // Try to access geolocation, if it throws or is undefined due to policy
        if (!navigator.geolocation) {
          setIsPreviewBlocked(true);
          setError('PREVIEW_BLOCKED');
        }
      }
    } catch {
      // Cross-origin iframe, likely preview
      setIsPreviewBlocked(true);
    }
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser. Use manual lat/lng or map click instead — works in preview. In production (Vercel/localhost), real GPS will work.');
      setIsPreviewBlocked(true);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          source: 'gps',
        });
        setLoading(false);
        setIsPreviewBlocked(false);
      },
      (err) => {
        let msg = err.message;
        // Detect permissions policy block
        if (msg.includes('disabled') || msg.includes('permissions policy') || msg.includes('Permission denied') || err.code === 1) {
          setIsPreviewBlocked(true);
          msg = 'PREVIEW_BLOCKED';
        }
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number, source: RealLocation['source'] = 'manual') => {
    setLocation({
      lat,
      lng,
      accuracy: source === 'gps' ? 5 : source === 'map-click' ? 10 : 50,
      timestamp: Date.now(),
      speed: null,
      heading: null,
      source,
    });
    setError(null);
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('PREVIEW_BLOCKED');
      setIsPreviewBlocked(true);
      return;
    }

    setWatching(true);
    setError(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          source: 'gps',
        });
      },
      (err) => {
        if (err.message.includes('disabled') || err.message.includes('permissions policy')) {
          setIsPreviewBlocked(true);
          setError('PREVIEW_BLOCKED');
        } else {
          setError(err.message);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
  }, []);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setWatching(false);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    location,
    error,
    loading,
    watching,
    isPreviewBlocked,
    getCurrentLocation,
    setManualLocation,
    startWatching,
    stopWatching,
  };
}
