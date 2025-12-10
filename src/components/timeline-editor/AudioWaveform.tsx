'use client';

import React, { useState, useEffect } from 'react';

type AudioWaveformProps = {
  videoPublicId: string;
};

const AudioWaveform = ({ videoPublicId }: AudioWaveformProps) => {
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
          body: JSON.stringify({ videoPublicId }),
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
      <div className="h-20 bg-gray-800/50 rounded-md flex items-center justify-center text-gray-400 text-sm">
        Generating audio waveform...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-20 bg-red-900/50 rounded-md flex items-center justify-center text-red-400 text-sm">
        Error: {error}
      </div>
    );
  }

  if (!waveformUrl) {
    return (
      <div className="h-20 bg-gray-800/50 rounded-md flex items-center justify-center text-gray-400 text-sm">
        No waveform available.
      </div>
    );
  }

  return (
    <div className="h-20 relative bg-gray-800/50 rounded-md overflow-hidden">
      <img
        src={waveformUrl}
        alt="Audio waveform"
        className="w-full h-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default React.memo(AudioWaveform);
