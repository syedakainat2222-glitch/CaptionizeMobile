'use client';

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024; // Corresponds to Tailwind's 'lg' breakpoint

export function useDeviceOrientation() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    handleResize(); // Set initial values

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isLandscape };
}
