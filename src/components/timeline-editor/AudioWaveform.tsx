'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type AudioWaveformProps = {
  videoPublicId: string;
  className?: string;
};

const AudioWaveform = ({ videoPublicId, className }: AudioWaveformProps) => {
  const [waveformUrl, setWaveformUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoPublicId) {
      setIsLoading(false);
      return;
    }

    const fetchWaveform = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/waveform', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoPublicId, fgColor: '#FFFFFF', bgColor: '#00000000' }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch waveform data');
        }

        const data = await response.json();
        if (data.success && data.waveformUrl) {
          setWaveformUrl(data.waveformUrl);
        } else {
          throw new Error(data.error || 'Invalid response from server');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching waveform:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWaveform();
  }, [videoPublicId]);

  if (isLoading) {
    return (
      <div className={cn("h-20 rounded-md flex items-center justify-center text-gray-400 text-sm", className)}>
        {/* Generating audio waveform... */}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("h-20 bg-red-900/50 rounded-md flex items-center justify-center text-red-400 text-sm", className)}>
        Error generating waveform
      </div>
    );
  }

  if (!waveformUrl) {
    return (
      <div className={cn("h-20 rounded-md flex items-center justify-center text-gray-400 text-sm", className)}>
        {/* No waveform available. */}
      </div>
    );
  }

  return (
    <div className={cn("h-20 relative rounded-md overflow-hidden", className)}>
      <img
        src={waveformUrl}
        alt="Audio waveform"
        className="w-full h-full object-cover"
        style={{ imageRendering: 'pixelated', mixBlendMode: 'screen' }}
      />
    </div>
  );
};

export default React.memo(AudioWaveform);
