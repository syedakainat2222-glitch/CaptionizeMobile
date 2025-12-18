'use client';

import { useState, useEffect } from 'react';

export function useDeviceOrientation() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const mobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobile);

    const handleOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
    handleOrientation();
    window.addEventListener('resize', handleOrientation);

    return () => window.removeEventListener('resize', handleOrientation);
  }, []);

  return { isMobile, isLandscape };
}
